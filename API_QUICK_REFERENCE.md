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
| `GET` | `/api` | Health check | No |

### 🔒 Protected Endpoints (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users/profile/avatar` | Upload avatar image |
| `PUT` | `/api/users/profile/username` | Update username (1/month limit) |
| `GET` | `/api/users/profile/2fa/secret` | Get 2FA secret & QR code |
| `POST` | `/api/users/profile/2fa/enable` | Enable 2FA |

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
