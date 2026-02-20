# Users Module - Registration & Login Implementation

## Overview
Complete user authentication module with registration, login, email verification, and email notifications.

## Features Implemented

### 1. **User Registration** (`POST /auth/register`)
- Validates email, username, and password
- Checks for duplicate email/username
- Hashes password using bcrypt
- Creates user with `unverified` status
- Generates email verification token (24h expiry)
- Creates user security record
- Tracks device information (IP, user agent, browser, OS)
- Sends verification email automatically

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "uuid"
}
```

### 2. **User Login** (`POST /auth/login`)
- Validates credentials
- Checks account status (not deleted, not locked)
- Implements failed login attempt tracking (locks after 5 attempts for 30 minutes)
- Updates last login timestamp and IP
- Tracks/updates device information
- Generates JWT access token (7 days expiry)
- Sends login notification email

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "status": "active"
  }
}
```

### 3. **Email Verification** (`GET /auth/verify-email?token=xxx`)
- Validates verification token
- Checks token expiry (24 hours)
- Updates user status to `active`
- Marks email as verified
- Marks token as used

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

## Module Structure

```
src/
├── users/
│   ├── dto/
│   │   ├── register.dto.ts          # Registration validation
│   │   ├── login.dto.ts             # Login validation
│   │   ├── verify-email.dto.ts      # Email verification
│   │   └── auth-response.dto.ts     # Auth response type
│   ├── helpers/
│   │   ├── password.helper.ts       # Password hashing/comparison
│   │   └── token.helper.ts          # Token generation utilities
│   ├── users.controller.ts          # API endpoints
│   ├── users.service.ts             # Business logic
│   └── users.module.ts              # Module definition
├── common/
│   ├── services/
│   │   ├── email.service.ts         # Modular email service
│   │   └── services.module.ts      # Global services module
│   ├── config/
│   │   └── email.config.ts          # Email configuration
│   ├── database/
│   │   ├── prisma.service.ts        # Prisma client service
│   │   └── database.module.ts       # Database module
│   ├── guards/
│   │   ├── jwt-auth.guard.ts         # JWT authentication guard
│   │   └── guards.module.ts         # Guards module
│   └── strategies/
│       └── jwt.strategy.ts          # JWT passport strategy
```

## Email Service (Modular & Reusable)

The `EmailService` is centralized in `src/common/services/email.service.ts` and can be injected into any module.

### Available Methods:
- `sendEmail(options)` - Generic email sending
- `sendVerificationEmail(email, token, username)` - Registration verification
- `sendLoginNotificationEmail(email, username, ip, userAgent)` - Login notifications

### Email Templates:
- **Verification Email**: HTML template with verification link
- **Login Notification**: HTML template with login details (time, IP, device)

## Security Features

1. **Password Security**
   - Bcrypt hashing with salt rounds (10)
   - Password requirements: min 8 chars, uppercase, lowercase, number

2. **Account Protection**
   - Failed login attempt tracking
   - Account locking after 5 failed attempts (30 min lockout)
   - Account status checking (active/unverified/suspended)

3. **Token Security**
   - Verification tokens hashed before storage
   - Token expiry (24 hours for email verification)
   - One-time use tokens

4. **Device Tracking**
   - Device fingerprinting (IP + User Agent hash)
   - Browser, OS, device type detection
   - Last seen tracking

## Environment Variables

Add these to your `.env` file (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/acd_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Application
PORT=3000
APP_URL=http://localhost:3000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=Account Deal App
EMAIL_FROM_EMAIL=your-email@gmail.com
```

## Database Schema Used

The implementation uses the following Prisma models:
- `User` - Main user table
- `UserSecurity` - Security settings and login tracking
- `AuthToken` - Email verification tokens
- `UserDevice` - Device tracking

## Error Handling

All endpoints handle errors appropriately:
- **400 Bad Request** - Invalid input, expired tokens
- **401 Unauthorized** - Invalid credentials, locked account
- **409 Conflict** - Duplicate email/username
- **500 Internal Server Error** - Server errors (logged)

## Usage Example

### Register a new user:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Verify Email:
```bash
curl http://localhost:3000/auth/verify-email?token=your-verification-token
```

## Next Steps

1. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

2. Set up email service (Gmail example):
   - Enable 2FA on Gmail
   - Generate App Password
   - Add credentials to `.env`

3. Test endpoints using Postman or curl

4. Use `@UseGuards(JwtAuthGuard)` on protected routes

## Notes

- Email service is modular and can be extended for other email types (password reset, deal notifications, etc.)
- JWT strategy validates user on each request and checks account status
- All user operations are logged for audit purposes
- Device tracking helps with security monitoring
