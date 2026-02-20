# Login Flow: OTP + 2FA

## Overview
Login is a multi-step flow: **email + password** → **OTP sent to email** → **user confirms OTP** → **2FA check (if enabled)** → **access token** → final login.

## Flow Diagram

```
1. POST /api/auth/login (email, password)
   → Validate credentials
   → Generate 6-digit OTP, store hash in DB
   → Send OTP to user email
   → Return { loginSessionId, expiresIn }

2. POST /api/auth/verify-otp (loginSessionId, otp)
   → Verify OTP
   → If 2FA enabled: return { requiresTwoFactor: true, loginSessionId (new) }
   → If 2FA disabled: complete login → return { accessToken, user }

3. [If 2FA] POST /api/auth/verify-2fa (loginSessionId, twoFactorCode)
   → Verify TOTP code
   → Complete login → return { accessToken, user }
```

## Endpoints

### 1. Login (Step 1 – send OTP)
**POST** `/api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "message": "OTP sent to your email. Please verify to continue.",
  "loginSessionId": "uuid",
  "expiresIn": 300
}
```

- Validates email + password.
- Resets failed attempts on success.
- Generates 6-digit OTP, stores hash in `auth_tokens` (type `login_otp`), expiry 5 minutes.
- Sends OTP to user email.
- Returns `loginSessionId` for the next step.

---

### 2. Verify OTP (Step 2)
**POST** `/api/auth/verify-otp`

**Request:**
```json
{
  "loginSessionId": "uuid-from-step-1",
  "otp": "123456"
}
```

**Response A – 2FA disabled (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "status": "active"
  }
}
```

**Response B – 2FA enabled (200):**
```json
{
  "requiresTwoFactor": true,
  "loginSessionId": "new-uuid-for-2fa-step",
  "expiresIn": 300
}
```

- Validates OTP against stored hash.
- Marks OTP token as used.
- If 2FA disabled: completes login (device, last login, login email) and returns `accessToken` + `user`.
- If 2FA enabled: creates `login_2fa_pending` token and returns `requiresTwoFactor` + new `loginSessionId`.

---

### 3. Verify 2FA (Step 3 – only if 2FA enabled)
**POST** `/api/auth/verify-2fa`

**Request:**
```json
{
  "loginSessionId": "uuid-from-verify-otp-response",
  "twoFactorCode": "123456"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "status": "active"
  }
}
```

- Validates TOTP code against `user_security.two_factor_secret`.
- Marks 2FA pending token as used.
- Completes login and returns `accessToken` + `user`.

## cURL Examples

### Full flow (no 2FA)
```bash
# Step 1: Login – get OTP
curl -X POST http://localhost:3000/api/auth/login \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# Step 2: Verify OTP (use loginSessionId from step 1, OTP from email)
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"loginSessionId":"PASTE_LOGIN_SESSION_ID","otp":"123456"}'
```

### Full flow (with 2FA)
```bash
# Step 1: Login
curl -X POST http://localhost:3000/api/auth/login ...

# Step 2: Verify OTP → get requiresTwoFactor + new loginSessionId
curl -X POST http://localhost:3000/api/auth/verify-otp ...

# Step 3: Verify 2FA (use loginSessionId from step 2, code from app)
curl -X POST http://localhost:3000/api/auth/verify-2fa \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"loginSessionId":"PASTE_NEW_LOGIN_SESSION_ID","twoFactorCode":"123456"}'
```

## Implementation Details

- **OTP:** 6 digits, 5-minute expiry, stored as SHA-256 hash in `auth_tokens` (type `login_otp`).
- **2FA:** TOTP via `otplib`; secret in `user_security.two_factor_secret` (Base32).
- **Session tokens:** `login_otp` and `login_2fa_pending` tokens in `auth_tokens`; IDs are `loginSessionId`.
- **Complete login:** Shared logic for device upsert, last login update, login notification email, JWT generation.

## Error Handling

- Invalid/expired OTP or session → `400` / `401` with clear message.
- Invalid 2FA code → `401 Unauthorized`.
- Account locked/deleted → `401 Unauthorized` at login step.

## Files Touched

- `src/users/helpers/otp.helper.ts` – OTP generation and hashing.
- `src/common/services/email.service.ts` – `sendLoginOtpEmail()`.
- `src/users/users.service.ts` – `login()` (OTP only), `verifyOtp()`, `verify2fa()`, `completeLogin()`.
- `src/users/users.controller.ts` – `POST verify-otp`, `POST verify-2fa`.
- DTOs: `VerifyOtpDto`, `Verify2faDto`.
