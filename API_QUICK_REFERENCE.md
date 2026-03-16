# API Quick Reference

## Base URL
```
http://localhost:3000/api
```

---

## Available Endpoints

### 🔓 Public Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | User login (sends OTP) | No |
| `POST` | `/api/auth/verify-otp` | Verify OTP code | No |
| `POST` | `/api/auth/verify-2fa` | Verify 2FA code (if enabled) | No |
| `GET` | `/api/auth/verify-email` | Verify email address | No |
| `POST` | `/api/auth/forgot-password` | Request password reset (sends OTP) | No |
| `POST` | `/api/auth/verify-forgot-password-otp` | Verify forgot-password OTP | No |
| `POST` | `/api/auth/verify-forgot-password-2fa` | Verify 2FA for forgot password (if enabled) | No |
| `POST` | `/api/auth/reset-password` | Set new password after forgot flow | No |
| `POST` | `/api/auth/change-password/verify-otp` | Verify change-password OTP | No |
| `POST` | `/api/auth/change-password/verify-2fa` | Verify 2FA for change password (if enabled) | No |
| `POST` | `/api/auth/change-password/confirm` | Set new password after change flow | No |
| `GET` | `/api` | Health check | No |
| `GET` | `/api/listings` | List active listings (optional: platform, category, status, page, limit) | No |
| `GET` | `/api/listings/:id` | Get listing by ID (active public; draft/archived only for owner via auth) | No |
| `GET` | `/api/listings/info` | Get listing info from URL (platform, title, thumbnail uploaded to storage, subscribers); query: `url` | No |
| `POST` | `/api/listings/verify` | Verify listing link (code in channel/profile description; body: verificationCode, socialMedia, link) | No |

### 🔒 Protected Endpoints (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users/profile/avatar` | Upload avatar image |
| `PUT` | `/api/users/profile/username` | Update username (1/month limit) |
| `GET` | `/api/users/profile/2fa/secret` | Get 2FA secret & QR code |
| `POST` | `/api/users/profile/2fa/enable` | Enable 2FA |
| `POST` | `/api/users/profile/change-password/request` | Request change password (sends OTP; requires current password) |
| `POST` | `/api/listings` | Create a listing | JWT |
| `GET` | `/api/listings/my` | List current user's listings (optional: status, page, limit) | JWT |
| `PATCH` | `/api/listings/:id` | Update listing (owner only) | JWT |
| `DELETE` | `/api/listings/:id` | Soft-delete listing (owner only) | JWT |

**Listings – test all APIs with payloads:** See **`docs/API_ENDPOINTS.md`** → **"Testing all Listing APIs (payloads & cURL)"** for request/response examples, query params, body payloads, and cURL for every listing endpoint.

### 🛡️ Admin panel (JWT + permission-based)

All admin routes require a valid JWT and at least one of the permissions listed.

| Method | Endpoint | Required permission(s) |
|--------|----------|------------------------|
| `GET` | `/api/admin/roles` | `roles:read` or `roles:write` |
| `GET` | `/api/admin/roles/:id` | `roles:read` or `roles:write` |
| `POST` | `/api/admin/roles` | `roles:write` |
| `PUT` | `/api/admin/roles/:id` | `roles:write` |
| `DELETE` | `/api/admin/roles/:id` | `roles:write` |
| `PUT` | `/api/admin/roles/:id/permissions` | `roles:write` |
| `GET` | `/api/admin/permissions` | `roles:read`, `permissions:read`, or `roles:write` |
| `GET` | `/api/admin/permissions/groups` | same as above |
| `GET` | `/api/admin/users/:userId/roles` | `users:read` or `users:assign_role` |
| `POST` | `/api/admin/users/:userId/roles` | `users:assign_role` |
| `DELETE` | `/api/admin/users/:userId/roles/:roleId` | `users:assign_role` |

**Roles (after seed):** `super_admin` (all permissions), `admin` (read roles/permissions, assign roles to users), `escrow_agent` (deals/escrow permissions). Assign the `super_admin` role to a user via DB or by having another super_admin call `POST /api/admin/users/:userId/roles` with `roleId` of the super_admin role.

---

## Quick Test Commands

### 1. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

### 3. Verify Email
```bash
curl "http://localhost:3000/api/auth/verify-email?token=YOUR_TOKEN_HERE"
```

### 4. Health Check
```bash
curl http://localhost:3000/api
```

---

## Forgot password flow (OTP + optional 2FA)

1. **POST /api/auth/forgot-password** – `{ "email": "user@example.com" }`  
   Sends OTP to email. Response: `{ "message": "...", "sessionId": "uuid", "expiresIn": 300 }`.

2. **POST /api/auth/verify-forgot-password-otp** – `{ "sessionId": "uuid", "otp": "123456" }`  
   Verifies OTP. If 2FA is enabled: `{ "requiresTwoFactor": true, "sessionId": "new-uuid", "expiresIn": 300 }`.  
   If not: `{ "sessionId": "uuid", "message": "..." }`.

3. **If 2FA required:** **POST /api/auth/verify-forgot-password-2fa** – `{ "sessionId": "new-uuid", "twoFactorCode": "123456" }`  
   Response: `{ "sessionId": "uuid", "message": "..." }`.

4. **POST /api/auth/reset-password** – `{ "sessionId": "uuid", "newPassword": "NewPass123" }`  
   Sets new password (same rules as register).

---

## Change password flow (authenticated; OTP + optional 2FA)

1. **POST /api/users/profile/change-password/request** (JWT required) – `{ "currentPassword": "OldPass123" }`  
   Sends OTP to email. Response: `{ "message": "...", "sessionId": "uuid", "expiresIn": 300 }`.

2. **POST /api/auth/change-password/verify-otp** – `{ "sessionId": "uuid", "otp": "123456" }`  
   If 2FA enabled: `{ "requiresTwoFactor": true, "sessionId": "new-uuid", "expiresIn": 300 }`.  
   If not: `{ "sessionId": "uuid", "message": "..." }`.

3. **If 2FA required:** **POST /api/auth/change-password/verify-2fa** – `{ "sessionId": "new-uuid", "twoFactorCode": "123456" }`.

4. **POST /api/auth/change-password/confirm** – `{ "sessionId": "uuid", "newPassword": "NewPass123" }`  
   Sets new password.

---

## Testing Update Username & 2FA (Protected APIs)

These endpoints require a **JWT** (user identity). You can send it in either:

- **`Authorization: Bearer YOUR_JWT`** (when not using Basic Auth), or  
- **`X-Access-Token: YOUR_JWT`** (when also sending Basic Auth in `Authorization`).

**When using both Basic Auth and JWT:** send Basic in `Authorization` and JWT in `X-Access-Token`. **Do not put quotes around the token** in the header (use `X-Access-Token: eyJ...` not `X-Access-Token: "eyJ..."`).

```bash
curl -X PUT http://localhost:3000/api/users/profile/username \
  -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: YOUR_JWT" \
  -d '{"username": "newusername"}'
```

**Step 0 – Get an access token**  
Register, verify email (or use the link from email), then login and verify OTP. Use the `accessToken` from the response as `YOUR_JWT` below.

**Quick test (Basic Auth + JWT):** If Basic Auth is enabled, use both. Replace the token with a fresh one from login if you get `401 Invalid or expired token` (expired or wrong `JWT_SECRET`).

```bash
# Export from .env: source .env  (or set BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD)
curl -X PUT http://localhost:3000/api/users/profile/username \
  -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: YOUR_ACCESS_TOKEN" \
  -d '{"username": "testuser3updated"}'
```

---

### Update username

- **Endpoint:** `PUT /api/users/profile/username`
- **Body:** `{ "username": "newusername" }` (3–50 chars, letters/numbers/underscores only; can change once per month)

```bash
# With Bearer only (no Basic Auth):
curl -X PUT http://localhost:3000/api/users/profile/username \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"username": "newusername"}'

# With both Basic Auth + JWT:
curl -X PUT http://localhost:3000/api/users/profile/username \
  -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: YOUR_JWT" \
  -d '{"username": "newusername"}'
```

**Success (200):**
```json
{
  "message": "Username updated successfully",
  "username": "newusername"
}
```

---

### Enable 2FA (two steps)

**Step 1 – Get 2FA secret and QR code**

```bash
# Bearer only:
curl -s -X GET http://localhost:3000/api/users/profile/2fa/secret \
  -H "Authorization: Bearer YOUR_JWT"

# Basic Auth + JWT:
curl -s -X GET http://localhost:3000/api/users/profile/2fa/secret \
  -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" \
  -H "X-Access-Token: YOUR_JWT"
```

**Response (200):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpAuthUrl": "otpauth://totp/...",
  "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=..."
}
```

- Open `qrCodeUrl` in a browser to show the QR code, or add the `secret` manually in Google Authenticator / Authy / etc.
- Get the current **6-digit code** from the app.

**Step 2 – Enable 2FA with that code**

```bash
# Replace 123456 with the 6-digit code from your authenticator app
# Bearer only:
curl -X POST http://localhost:3000/api/users/profile/2fa/enable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"twoFactorCode": "123456"}'

# Basic Auth + JWT:
curl -X POST http://localhost:3000/api/users/profile/2fa/enable \
  -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: YOUR_JWT" \
  -d '{"twoFactorCode": "123456"}'
```

**Success (200):**
```json
{
  "message": "Two-factor authentication enabled successfully"
}
```

**Common errors:**
- `400` – "2FA secret not found" → Call `GET .../2fa/secret` first.
- `400` – "2FA is already enabled" → 2FA is already on for this user.
- `401` – "Invalid two-factor code" → Use the current 6-digit code from the app (it changes every 30 seconds).

---

## Response Examples

### Register Response (201)
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "uuid-string"
}
```

### Login Response (200)
First step returns OTP session:
```json
{
  "message": "OTP sent to your email. Please verify to continue.",
  "loginSessionId": "uuid",
  "expiresIn": 300
}
```
After verify-otp (and verify-2fa if enabled), same shape as below (accessToken + user).

**If email is not verified:** Login returns `400` and sends a new verification email:
```json
{
  "statusCode": 400,
  "message": "Email not verified. A new verification link has been sent to your email."
}
```

### Verify Email Response (200)
Returns access token and user (user is logged in after verifying):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "username": "testuser",
    "emailVerified": true,
    "status": "active"
  }
}
```

---

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials, locked account)
- `409` - Conflict (email/username already exists)

---

## Testing Tips

1. **Start the server:**
   ```bash
   npm run start:dev
   ```

2. **Check server is running:**
   ```bash
   curl http://localhost:3000/api
   ```

3. **Test registration flow:**
   - Register → Check email → Verify → Login

4. **Test account lock:**
   - Try wrong password 5 times → Account locks → Email sent

5. **Check email notifications:**
   - Registration: Verification email
   - Login: Success email with device info
   - Lock: Account locked email

---

For detailed documentation, see `docs/API_ENDPOINTS.md`
