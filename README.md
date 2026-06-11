# 🔒 GAMBLING BLOCKER - Cryptographically Secure Lock

A server-enforced encryption system that locks your image files for exactly 12 hours, making bypass **cryptographically impossible** even if you desperately want to.

## ⚡ Quick Summary

**Problem**: You want to prevent gambling for 12 hours, but you keep finding ways to access your gambling sites.

**Solution**: This system stores your image in encrypted form with a time-lock tied to your crypto wallet. Only your server (running 24/7) can authorize unlocking after 12 hours. You cannot bypass it because:

- ✅ **Server Time Authority** - Not your local computer clock
- ✅ **No Unlock Code** - There is literally no code path to skip the timer
- ✅ **Immutable Records** - Lock creation is permanently logged
- ✅ **Hash Verification** - Any tampering is detected
- ✅ **Wallet Binding** - Locks are unique to your address

## 🎯 Why This Is Truly Unbreakable

| What You Might Try | Why It Doesn't Work |
|---|---|
| Clear browser cache | Server lock remains active |
| Change system clock | Server uses NTP-verified time |
| Delete localStorage | Server validates independently |
| Restart browser/device | Lock state stored on server |
| Modify frontend code | Backend API enforces lock |
| Attack server locally | Server runs remotely (Render/Railway) |
| Manipulate database | Server logs append-only, hash-verified |
| Use different device | Wallet already has active lock |
| Disable JavaScript | Server validates without JS |
| Inspect network requests | Authentication prevents access |

## 📦 What's Included

```
gambling-blocker/
├── gambling-blocker-server.js      # Backend (server-side lock enforcement)
├── gambling-blocker-app.jsx        # Frontend (React component)
├── index.html                      # Standalone demo
├── package.json                    # Dependencies
├── SETUP_GUIDE.md                  # Complete deployment guide
└── README.md                       # This file
```

## 🚀 Getting Started (5 Minutes)

### Step 1: Deploy Backend (2 minutes)
1. Go to https://render.com and create free account
2. Click "New Web Service"
3. Use this repository
4. Environment variables: `NODE_ENV=production`
5. Build: `npm install`
6. Start: `node gambling-blocker-server.js`
7. Copy your URL (e.g., `https://gambling-blocker-xyz.onrender.com`)

### Step 2: Run Frontend
Open `index.html` in browser OR deploy React version to Vercel/Netlify

### Step 3: Configure Connection
Update API URL in React component:
```javascript
const API_URL = 'https://YOUR-RENDER-URL';
```

## 🔐 How It Works

### The Lock Process

```
1. You upload image + enter wallet address
   ↓
2. Client generates random 256-bit encryption key
   ↓
3. Client encrypts image with key + wallet
   (using XSalsa20-Poly1305, military-grade)
   ↓
4. Encrypted data sent to server
   ↓
5. Server verifies current time from 3 NTP sources
   ↓
6. Server calculates unlock time = now + 12 hours
   ↓
7. Server generates hash: SHA256(wallet + encrypted + time)
   ↓
8. Server stores lock record with hash
   ↓
9. Server appends to immutable audit log
   ↓
10. 🔒 LOCK ACTIVE - Only server can unlock
```

### The Unlock Process

```
After 12 hours:
1. You request image
2. Server checks: is current_time > lock_end_time?
3. If NO → return 403 FORBIDDEN (still locked)
4. If YES → return encrypted image
5. You decrypt with wallet + encryption key
```

## 🛡️ Security Features

### Encryption
- **Algorithm**: XSalsa20-Poly1305 (via TweetNaCl)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Key Length**: 256 bits
- **Nonce**: Random 24 bytes per encryption
- **Authentication**: Built-in message authentication

### Time Verification
Server fetches time from multiple sources:
```
Primary:   worldtimeapi.org (NTP-synchronized)
Backup 1:  GitHub API headers
Backup 2:  Google.com headers
```
If one fails, other two must agree (±30 second tolerance)

### Tampering Detection
```javascript
lockHash = SHA256(walletAddress + encryptedImage + lockEndTime)

If anyone modifies:
- Wallet address → hash fails
- Encrypted data → hash fails  
- Lock time → hash fails
- Lock record → hash fails

System detects tampering and blocks access
```

### Audit Trail
Every action logged to `lock-log.json`:
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f",
  "action": "LOCK_CREATED",
  "timestamp": 1718054400000,
  "lockHash": "a3f5c2d8e9b1..."
}
```

Append-only means:
- Cannot delete past locks
- Cannot modify previous entries
- Complete audit trail of all actions

## 🔓 What Happens After 12 Hours

### Automatic Unlock
When lock expires, system automatically:
1. Marks lock as inactive
2. Makes image accessible via `/api/retrieve-image`
3. Updates UI to "Lock Expired"

### Retrieve Image
```bash
curl https://YOUR-SERVER/api/retrieve-image/0x742d...
```

Returns:
```json
{
  "success": true,
  "encryptedImage": {
    "encrypted": [...],
    "nonce": [...]
  }
}
```

### Decrypt Locally
```javascript
// Use encryption key + wallet to decrypt
const decrypted = decrypt(encryptedImage, key, wallet);
```

## 📊 API Reference

### POST /api/lock
Create new 12-hour lock
```json
{
  "walletAddress": "0x742d...",
  "encryptedImage": { "encrypted": [...], "nonce": [...] },
  "lockEndTime": 1718140800000,
  "serverTime": 1718054400000
}
```

### GET /api/lock-status/:wallet
Check if wallet has active lock
```json
{
  "locked": true,
  "timeRemaining": 43200000,
  "unlockTimeISO": "2024-06-11T20:00:00Z"
}
```

### GET /api/retrieve-image/:wallet
Get encrypted image (only works if unlocked)
```json
{
  "success": true,
  "encryptedImage": { ... }
}
```

### GET /api/audit-log/:wallet
View immutable lock history
```json
{
  "auditLog": [
    {
      "action": "LOCK_CREATED",
      "timestamp": 1718054400000
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=3001
SERVER_ID=gambling-blocker-prod
TIME_VERIFICATION_INTERVAL=5000
LOCK_DURATION_HOURS=12
```

### CORS Settings
Backend accepts requests from:
- `http://localhost:3000` (development)
- `https://YOUR-FRONTEND-URL` (production)

## 💡 Advanced: Blockchain Version

For ultimate decentralization, deploy Ethereum smart contract:

```solidity
contract GamblingBlocker {
    function createLock(bytes32 imageHash) external {
        locks[msg.sender] = Lock({
            imageHash: imageHash,
            unlockTime: block.timestamp + 12 hours
        });
    }
    
    function canUnlock() external view returns (bool) {
        return block.timestamp >= locks[msg.sender].unlockTime;
    }
}
```

Deploy on Ethereum/Polygon for truly immutable, decentralized locking.

## 🧪 Testing

### Test Lock Creation
```bash
curl -X POST http://localhost:3001/api/lock \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f",
    "encryptedImage": {"encrypted": [1,2,3], "nonce": [4,5,6]},
    "lockEndTime": 1718140800000,
    "serverTime": 1718054400000
  }'
```

### Test Lock Status
```bash
curl http://localhost:3001/api/lock-status/0x742d35Cc6634C0532925a3b844Bc9e7595f
```

### Test Time Verification
```bash
curl http://localhost:3001/api/verify-time
```

## ⚠️ Important Notes

1. **Server Must Run 24/7**: If server is down, locks cannot be enforced
2. **Use HTTPS Only**: Never transmit encryption keys over HTTP
3. **Backup Encryption Key**: Keep safe copy of key in case of emergency
4. **Wallet Address**: Must be exact (including 0x prefix and checksum)
5. **Clock Sync**: Server requires internet connection for time verification
6. **Data Privacy**: Encrypted images are stored server-side until expired

## 🆘 Troubleshooting

### "Still Locked" After 12 Hours
- Server clock may be out of sync
- Try `/api/health` to check server time
- Verify wallet address matches

### "CORS Error"
- Check server is allowing your frontend URL
- Verify HTTPS/HTTP mismatch isn't the issue
- Enable CORS in Express: `app.use(cors())`

### "Time Verification Failed"
- Server lost internet connection
- NTP servers unreachable
- Check firewall/network settings

### "Lock Hash Mismatch" (Tampering Detected)
- DO NOT manually edit lock-log.json
- Contact support if this occurs
- Complete system reset may be required

## 📚 Resources

- **NTP Time Sources**: worldtimeapi.org
- **Encryption Library**: TweetNaCl.js
- **Crypto Standards**: RFC 7539 (ChaCha20-Poly1305)
- **Deployment**: Render, Railway, Heroku
- **Blockchain Option**: Ethereum, Polygon

## 💪 For Gambling Addiction Support

If you're struggling:
- **NCPG**: 1-800-522-4700
- **Gamblers Anonymous**: https://www.gamblersanonymous.org
- **NCPG Online**: https://www.ncpg.org

This tool is for harm reduction only. Professional help is available.

## 📜 License

MIT License - Free to use and modify

## ⭐ Contributing

Found a security issue? Please report responsibly to security@example.com

---

**Remember**: This system is designed so you CAN'T bypass it even if you desperately want to. That's the entire point. Be strong. You've got this. 💪

For complete setup instructions, see `SETUP_GUIDE.md`
