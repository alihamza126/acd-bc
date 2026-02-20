# Profile Management API

## Overview
APIs for user profile management including avatar upload, username change (with 1 month limit), and 2FA setup.

## Authentication
All endpoints require JWT Bearer token authentication.

---

## Endpoints

### 1. Update Avatar
**POST** `/api/users/profile/avatar`

Upload and update user avatar image.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Request:**
- Form data with field name: `avatar`
- File types allowed: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- Max file size: 10MB

**Response (200):**
```json
{
  "message": "Avatar updated successfully",
  "avatarUrl": "https://storage-provider.com/avatars/timestamp-random.jpg"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/users/profile/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -F "avatar=@/path/to/image.jpg"
```

---

### 2. Update Username
**PUT** `/api/users/profile/username`

Update username (limited to once per month).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request:**
```json
{
  "username": "newusername"
}
```

**Validation:**
- Minimum 3 characters
- Maximum 50 characters
- Only letters, numbers, and underscores
- Must be different from current username
- Can only change once per month

**Response (200):**
```json
{
  "message": "Username updated successfully",
  "username": "newusername"
}
```

**Error Responses:**
- `400 Bad Request` - Username validation failed or change limit reached
- `409 Conflict` - Username already taken

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/users/profile/username \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"username":"newusername"}'
```

**Username Change Limit:**
- Users can change username **once per month**
- If attempted within 30 days, returns error with days remaining
- Example error: `"Username can only be changed once per month. Please try again in 15 days."`

---

### 3. Get 2FA Secret (Setup)
**GET** `/api/users/profile/2fa/secret`

Generate 2FA secret and QR code for setup.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpAuthUrl": "otpauth://totp/Account%20Deal%20App:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Account%20Deal%20App",
  "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=..."
}
```

**Error Responses:**
- `400 Bad Request` - 2FA already enabled

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/users/profile/2fa/secret \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ="
```

**Usage:**
1. Call this endpoint to get secret and QR code
2. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
3. Get 6-digit code from app
4. Call `/api/users/profile/2fa/enable` with the code

---

### 4. Enable 2FA
**POST** `/api/users/profile/2fa/enable`

Enable 2FA after verifying the code from authenticator app.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request:**
```json
{
  "twoFactorCode": "123456"
}
```

**Response (200):**
```json
{
  "message": "Two-factor authentication enabled successfully"
}
```

**Error Responses:**
- `400 Bad Request` - 2FA already enabled or secret not found
- `401 Unauthorized` - Invalid two-factor code

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/users/profile/2fa/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"twoFactorCode":"123456"}'
```

---

## Storage Configuration

### AWS S3 Setup

Add to `.env`:
```env
STORAGE_PROVIDER=aws
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

**S3 Bucket Setup:**
1. Create S3 bucket
2. Enable public read access for uploaded files (or use CloudFront)
3. Configure CORS if needed
4. Add credentials to `.env`

### Cloudinary Setup

Add to `.env`:
```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Cloudinary Setup:**
1. Sign up at https://cloudinary.com
2. Get credentials from dashboard
3. Add to `.env`

---

## Implementation Details

### Storage Service
- **Location:** `src/common/services/storage.service.ts`
- **Supports:** AWS S3 and Cloudinary
- **Features:**
  - File upload with validation (type, size)
  - File deletion
  - Automatic URL generation
  - Error handling

### Username Change Tracking
- **Field:** `user_security.last_username_change_at`
- **Limit:** Once per 30 days
- **Validation:** Checks last change date before allowing update

### 2FA Implementation
- **Method:** TOTP (Time-based One-Time Password)
- **Library:** `otplib`
- **Storage:** Secret stored in `user_security.two_factor_secret`
- **QR Code:** Generated using external QR service (can be replaced with local generation)

---

## File Upload Limits

- **Max Size:** 10MB
- **Allowed Types (Avatar):**
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`

---

## Error Handling

All endpoints handle errors appropriately:
- **400 Bad Request** - Validation errors, limits reached
- **401 Unauthorized** - Invalid token or 2FA code
- **409 Conflict** - Username already taken
- **500 Internal Server Error** - Server errors (logged)

---

## Testing Workflow

### 1. Update Avatar
```bash
# Get JWT token from login
TOKEN="your-jwt-token"

# Upload avatar
curl -X POST http://localhost:3000/api/users/profile/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -F "avatar=@./avatar.jpg"
```

### 2. Update Username
```bash
curl -X PUT http://localhost:3000/api/users/profile/username \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"username":"newusername"}'
```

### 3. Setup 2FA
```bash
# Step 1: Get secret and QR code
curl -X GET http://localhost:3000/api/users/profile/2fa/secret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ="

# Step 2: Scan QR code with authenticator app
# Step 3: Enable with code from app
curl -X POST http://localhost:3000/api/users/profile/2fa/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"twoFactorCode":"123456"}'
```

---

## Notes

- **Avatar Upload:** Old avatar is automatically deleted when new one is uploaded
- **Username Change:** Tracked per user, resets after 30 days
- **2FA Secret:** Generated on-demand, stored securely in database
- **Storage:** Switch between AWS S3 and Cloudinary via `STORAGE_PROVIDER` env var
- **File Validation:** All uploads are validated for type and size before storage
