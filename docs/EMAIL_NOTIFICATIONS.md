# Email Notifications - Account Security

## Overview
The application sends email notifications for important account security events including login success and account lockout.

## Email Types

### 1. **Login Success Notification**
Sent when a user successfully logs in.

**Includes:**
- ✅ Login date and time
- 🌐 IP Address
- 🌍 Browser (Chrome, Firefox, Safari, Edge, etc.)
- 💻 Operating System (Windows, macOS, Linux, Android, iOS)
- 📱 Device Type (Mobile/Desktop)
- 🔍 Full User Agent string

**Email Subject:** `Login Successful - Account Deal App`

**When Sent:** Immediately after successful login

### 2. **Account Locked Notification**
Sent when an account is locked due to multiple failed login attempts.

**Includes:**
- 🔒 Lock details:
  - Number of failed attempts
  - Lock time
  - Unlock time
  - Lock duration (30 minutes)
- 🔍 Login attempt details:
  - IP Address
  - Browser
  - Operating System
  - Device Type
  - User Agent
- ⚠️ Security recommendations

**Email Subject:** `Account Locked - Account Deal App`

**When Sent:** When account reaches 5 failed login attempts

**Lock Duration:** 30 minutes

## Implementation Details

### Email Service Methods

#### `sendLoginNotificationEmail()`
```typescript
sendLoginNotificationEmail(
  email: string,
  username: string,
  ipAddress?: string,
  userAgent?: string,
  browser?: string,
  os?: string,
  deviceType?: string,
): Promise<boolean>
```

#### `sendAccountLockedEmail()`
```typescript
sendAccountLockedEmail(
  email: string,
  username: string,
  ipAddress?: string,
  userAgent?: string,
  browser?: string,
  os?: string,
  deviceType?: string,
  failedAttempts?: number,
  lockedUntil?: Date,
): Promise<boolean>
```

### Login Flow

1. **Failed Login Attempt:**
   - Increments failed attempts counter
   - If reaches 5 attempts:
     - Locks account for 30 minutes
     - Sends account locked email
   - Throws UnauthorizedException

2. **Successful Login:**
   - Resets failed attempts counter
   - Updates last login timestamp and IP
   - Creates/updates device record
   - Generates JWT token
   - Sends login success notification email

## Email Templates

Both emails use HTML templates with:
- Responsive design
- Clear visual hierarchy
- Security warnings where appropriate
- Professional styling

## Security Features

### Account Lockout Protection
- **Max Attempts:** 5 failed login attempts
- **Lock Duration:** 30 minutes
- **Auto-unlock:** Account automatically unlocks after lock duration
- **Email Notification:** User is immediately notified when account is locked

### Device Tracking
- Device fingerprinting (IP + User Agent hash)
- Browser detection
- OS detection
- Device type detection (mobile/desktop)
- Last seen tracking

## Example Email Content

### Login Success Email
```
✅ Login Successful

Hi johndoe,

We detected a successful login to your account. Here are the details:

Login Details
📅 Date & Time: Monday, February 18, 2026 at 4:45:30 PM
🌐 IP Address: 192.168.1.100
🌍 Browser: Chrome
💻 Operating System: macOS
📱 Device Type: 🖥️ Desktop

⚠️ Security Notice: If this wasn't you, please secure your account immediately.
```

### Account Locked Email
```
🔒 Account Locked

Hi johndoe,

Your account has been temporarily locked due to multiple failed login attempts.

Lock Details
🔢 Failed Attempts: 5
⏰ Locked At: Monday, February 18, 2026 at 4:45:30 PM
🔓 Unlocks At: Monday, February 18, 2026 at 5:15:30 PM
⏳ Duration: 30 minutes

Login Attempt Details
🌐 IP Address: 192.168.1.100
🌍 Browser: Chrome
💻 Operating System: macOS
📱 Device Type: 🖥️ Desktop

What to do next?
• Wait 30 minutes before attempting to login again
• Make sure you're using the correct password
• If you forgot your password, use the password reset feature
• If this wasn't you, secure your account immediately
```

## Configuration

No additional configuration needed. Email notifications are automatically sent when:
- User successfully logs in
- Account is locked due to failed attempts

Email service uses the same configuration as other emails (see `.env.example`).

## Error Handling

- Email sending failures are logged but don't block the login process
- If email fails to send, the operation continues normally
- Errors are logged for monitoring

## Testing

To test email notifications:

1. **Login Success:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"correct-password"}'
   ```

2. **Account Lock:**
   - Attempt to login with wrong password 5 times
   - Account will be locked and email will be sent
