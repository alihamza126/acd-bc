# Basic Authentication - Application Level (REQUIRED)

## Overview
Basic authentication is now **REQUIRED** at the application level for all API requests when `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are configured in `.env`.

## Configuration

Add to your `.env` file:
```env
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your-secure-password
```

**Important:**
- If these env vars are **set** → Basic auth is **REQUIRED** for ALL requests
- If these env vars are **not set** → Basic auth is **disabled** (all requests allowed)

## How It Works

### When Basic Auth is Enabled (env vars set):
1. **ALL API requests** must include `Authorization: Basic ...` header
2. Credentials are validated against `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD`
3. If missing or invalid → `401 Unauthorized`
4. If valid → Request proceeds (JWT auth can then be used for protected endpoints)

### When Basic Auth is Disabled (env vars not set):
- All requests proceed normally without basic auth requirement
- Useful for development/testing

## Usage

### Encode Credentials
```bash
# Format: username:password
echo -n "admin:password" | base64
# Output: YWRtaW46cGFzc3dvcmQ=
```

### Include in All Requests

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"johndoe","password":"SecurePass123"}'
```

**JavaScript/Fetch:**
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa('admin:password'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});
```

**Postman:**
1. Go to Authorization tab
2. Select "Basic Auth"
3. Enter username: `admin`
4. Enter password: `password`
5. Postman will automatically add the header

## Error Responses

### Missing Basic Auth Header
```json
{
  "statusCode": 401,
  "message": "Basic authentication required. Please provide Authorization header with Basic credentials.",
  "error": "Unauthorized"
}
```

### Invalid Credentials
```json
{
  "statusCode": 401,
  "message": "Invalid basic authentication credentials",
  "error": "Unauthorized"
}
```

### Invalid Format
```json
{
  "statusCode": 401,
  "message": "Invalid basic authentication header format",
  "error": "Unauthorized"
}
```

## Testing

### Test with Basic Auth:
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'
```

### Test without Basic Auth (should fail if enabled):
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123"}'

# Response: 401 Unauthorized
```

## Implementation Details

- **Guard:** `BasicAuthGuard` in `src/common/guards/basic-auth.guard.ts`
- **Scope:** Global (applied to all routes via `APP_GUARD`)
- **Priority:** Runs before JWT authentication
- **Validation:** Checks env vars on startup, logs warning if not set

## Security Best Practices

1. **Use Strong Passwords:** Choose a strong password for `BASIC_AUTH_PASSWORD`
2. **Never Commit .env:** Add `.env` to `.gitignore`
3. **Use Different Credentials:** Use different credentials for dev/staging/production
4. **HTTPS in Production:** Always use HTTPS when basic auth is enabled
5. **Rotate Credentials:** Regularly rotate basic auth credentials

## Disabling Basic Auth

To disable basic auth (for development):
1. Remove or comment out `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` from `.env`
2. Restart the application
3. All requests will proceed without basic auth requirement

## Notes

- Basic auth is checked **before** JWT authentication
- If basic auth is valid, `request.basicAuthValid = true` is set
- JWT guards can skip validation if basic auth is valid
- Basic auth works alongside JWT - you can use both
