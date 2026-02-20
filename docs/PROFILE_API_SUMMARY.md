# Profile API - Quick Summary

## New Endpoints Added

### 🔒 Protected Endpoints (JWT Required)

1. **POST** `/api/users/profile/avatar` - Upload avatar image
2. **PUT** `/api/users/profile/username` - Update username (1/month limit)
3. **GET** `/api/users/profile/2fa/secret` - Get 2FA secret & QR code
4. **POST** `/api/users/profile/2fa/enable` - Enable 2FA

---

## Features Implemented

### ✅ Avatar Upload
- File upload with multer
- Supports AWS S3 or Cloudinary
- Validates file type (JPEG, PNG, WebP)
- Max size: 10MB
- Auto-deletes old avatar

### ✅ Username Change
- Limited to **once per month**
- Validates uniqueness
- Tracks last change date in `user_security.last_username_change_at`
- Returns days remaining if limit reached

### ✅ 2FA Setup
- Generate TOTP secret
- QR code generation for authenticator apps
- Verify code before enabling
- Stores secret securely in database

### ✅ Centralized Storage
- **AWS S3** support
- **Cloudinary** support
- Switch via `STORAGE_PROVIDER` env var
- Automatic URL generation
- File deletion support

---

## Configuration

Add to `.env`:

### AWS S3:
```env
STORAGE_PROVIDER=aws
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Cloudinary:
```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

---

## Quick Test

```bash
# Get JWT token first (from login)
TOKEN="your-jwt-token"

# 1. Upload avatar
curl -X POST http://localhost:3000/api/users/profile/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -F "avatar=@./image.jpg"

# 2. Update username
curl -X PUT http://localhost:3000/api/users/profile/username \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"username":"newusername"}'

# 3. Get 2FA secret
curl -X GET http://localhost:3000/api/users/profile/2fa/secret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ="

# 4. Enable 2FA
curl -X POST http://localhost:3000/api/users/profile/2fa/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"twoFactorCode":"123456"}'
```

---

## Database Changes

- Added `last_username_change_at` to `user_security` table
- Run migration: `npm run prisma:migrate`

---

For detailed documentation, see `docs/PROFILE_API.md`
