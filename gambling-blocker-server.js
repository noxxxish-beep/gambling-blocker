```js id="8yq3hf"
// gambling-blocker-server.js

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';

const app = express();

app.use(cors());

app.use(express.json({
  limit: '50mb'
}));

// File upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

// In-memory database
const lockDatabase = new Map();

// Verify server time
const getVerifiedServerTime = async () => {
  try {

    const response =
      await fetch(
        'https://worldtimeapi.org/api/timezone/UTC'
      );

    const data = await response.json();

    return data.unixtime * 1000;

  } catch (err) {

    console.error(
      'Time verification failed'
    );

    return Date.now();
  }
};

// Generate anti-tamper hash
const generateLockHash = (
  walletAddress,
  encryptedImage,
  lockEndTime
) => {

  return crypto
    .createHash('sha256')
    .update(
      walletAddress +
      JSON.stringify(encryptedImage) +
      lockEndTime
    )
    .digest('hex');
};

/**
 * HEALTH CHECK
 */
app.get('/api/health', async (req, res) => {

  const serverTime =
    await getVerifiedServerTime();

  res.json({
    status: 'OK',
    serverTime,
    timestamp:
      new Date(serverTime).toISOString()
  });
});

/**
 * CREATE LOCK
 */
app.post(
  '/api/lock',
  upload.single('image'),
  async (req, res) => {

    try {

      const { walletAddress } = req.body;

      const imageFile = req.file;

      if (!walletAddress) {

        return res.status(400).json({
          error: 'Wallet address required'
        });
      }

      if (!imageFile) {

        return res.status(400).json({
          error: 'No image uploaded'
        });
      }

      if (walletAddress.length < 20) {

        return res.status(400).json({
          error: 'Invalid wallet address'
        });
      }

      // Current server time
      const currentTime =
        await getVerifiedServerTime();

      // 12-hour lock
      const lockEndTime =
        currentTime +
        (12 * 60 * 60 * 1000);

      // Store image
      const encryptedImage = {
        filename: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size,
        data:
          imageFile.buffer.toString('base64')
      };

      // Create tamper-proof hash
      const lockHash =
        generateLockHash(
          walletAddress,
          encryptedImage,
          lockEndTime
        );

      // Existing active lock check
      if (lockDatabase.has(walletAddress)) {

        const existingLock =
          lockDatabase.get(walletAddress);

        if (
          existingLock.lockEndTime >
          currentTime
        ) {

          return res.status(409).json({
            error:
              'Wallet already has active lock',
            timeRemaining:
              existingLock.lockEndTime -
              currentTime
          });
        }
      }

      // Lock record
      const lockRecord = {

        walletAddress,

        encryptedImage,

        lockEndTime,

        lockHash,

        createdAt: currentTime,

        createdAtISO:
          new Date(currentTime)
            .toISOString(),

        locked: true
      };

      // Save lock
      lockDatabase.set(
        walletAddress,
        lockRecord
      );

      // Append immutable log
      fs.appendFileSync(
        'lock-log.json',

        JSON.stringify({
          action: 'LOCK_CREATED',
          walletAddress,
          lockEndTime,
          createdAt: currentTime,
          lockHash
        }) + '\n'
      );

      res.json({

        success: true,

        message:
          'Image locked successfully',

        lockHash,

        lockEndTime,

        unlockTime:
          new Date(lockEndTime)
            .toISOString()
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);

/**
 * CHECK LOCK STATUS
 */
app.get(
  '/api/lock-status/:wallet',
  async (req, res) => {

    try {

      const { wallet } = req.params;

      const currentTime =
        await getVerifiedServerTime();

      if (!lockDatabase.has(wallet)) {

        return res.json({
          locked: false,
          message: 'No lock found'
        });
      }

      const lock =
        lockDatabase.get(wallet);

      // Verify tamper hash
      const expectedHash =
        generateLockHash(
          lock.walletAddress,
          lock.encryptedImage,
          lock.lockEndTime
        );

      if (
        expectedHash !== lock.lockHash
      ) {

        return res.status(400).json({
          error:
            'TAMPERING DETECTED'
        });
      }

      const timeRemaining =
        Math.max(
          0,
          lock.lockEndTime -
          currentTime
        );

      const isLocked =
        timeRemaining > 0;

      res.json({

        locked: isLocked,

        timeRemaining,

        lockEndTime:
          lock.lockEndTime,

        unlockTime:
          new Date(lock.lockEndTime)
            .toISOString(),

        currentServerTime:
          currentTime
      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });
    }
  }
);

/**
 * RETRIEVE IMAGE
 */
app.get(
  '/api/retrieve-image/:wallet',
  async (req, res) => {

    try {

      const { wallet } = req.params;

      const currentTime =
        await getVerifiedServerTime();

      if (!lockDatabase.has(wallet)) {

        return res.status(404).json({
          error: 'No lock found'
        });
      }

      const lock =
        lockDatabase.get(wallet);

      // Lock enforcement
      if (
        currentTime <
        lock.lockEndTime
      ) {

        return res.status(403).json({

          error:
            'IMAGE STILL LOCKED',

          timeRemaining:
            lock.lockEndTime -
            currentTime,

          unlockTime:
            new Date(lock.lockEndTime)
              .toISOString()
        });
      }

      // Return image
      res.json({

        success: true,

        encryptedImage:
          lock.encryptedImage
      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });
    }
  }
);

/**
 * VERIFY TIME
 */
app.post(
  '/api/verify-time',
  async (req, res) => {

    const serverTime =
      await getVerifiedServerTime();

    const clientTime =
      req.body.clientTime || 0;

    const difference =
      Math.abs(
        serverTime - clientTime
      );

    res.json({

      serverTime,

      timestamp:
        new Date(serverTime)
          .toISOString(),

      timeDifference:
        difference,

      status:
        difference > 5000
          ? 'CLOCK_MISMATCH'
          : 'OK',

      nonce:
        crypto.randomBytes(16)
          .toString('hex')
    });
  }
);

// Root route
app.get('/', (req, res) => {

  res.send(`
    <h1>🔒 Gambling Blocker API</h1>
    <p>Server is running.</p>
    <p>Health check:
      <a href="/api/health">
        /api/health
      </a>
    </p>
  `);
});

// Start server
const PORT =
  process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log(
    '🔒 Gambling Blocker running'
  );

  console.log(
    'Port:',
    PORT
  );
});

export default app;
```
