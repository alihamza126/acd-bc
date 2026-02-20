# API Prefix & Basic Authentication Setup

## Overview
All API endpoints are prefixed with `/api` and application-level basic authentication is implemented.

## Features

### 1. **Global API Prefix**
- All routes are prefixed with `/api`
- Example: `/auth/register` → `/api/auth/register`

### 2. **Application-Level Basic Authentication**
- **REQUIRED** basic auth validation at application level (if env vars are set)
- **ALL requests** must include Basic Auth header with valid credentials
- If `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set in `.env`, basic auth is enforced
- If env vars are not set, basic auth is disabled (all requests allowed)
- If Basic Auth is missing or invalid, request is rejected with `401 Unauthorized`

## Configuration

Add these to your `.env` file:

```env
# Basic Authentication (optional)
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your-secure-password
```

**Important:** 
- If `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set, **ALL API requests MUST include Basic Auth header**
- If env vars are not set, basic auth is disabled (all requests allowed without basic auth)
- Basic auth is checked BEFORE any other authentication (JWT, etc.)

## How It Works

### Basic Auth Guard Flow:
1. **Env vars not set** → Basic auth disabled, all requests allowed
2. **Env vars set** → Basic auth REQUIRED for all requests:
   - **No Basic Auth Header** → Returns `401 Unauthorized` - "Basic authentication required"
   - **Basic Auth Header Present** → Validates against env credentials
     - ✅ **Valid** → Sets `request.basicAuthValid = true` and allows request
     - ❌ **Invalid** → Returns `401 Unauthorized` - "Invalid basic authentication credentials"

### JWT Auth Guard:
- Checks if `request.basicAuthValid` is true
- If true, skips JWT validation
- If false, proceeds with normal JWT token validation

## API Endpoints

All endpoints are now prefixed with `/api`:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email?token=xxx` - Email verification

## Usage Examples

### Without Basic Auth (Normal Flow):
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"johndoe","password":"SecurePass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

### With Basic Auth:
```bash
# Register with Basic Auth
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YWRtaW46eW91ci1zZWN1cmUtcGFzc3dvcmQ=" \
  -d '{"email":"user@example.com","username":"johndoe","password":"SecurePass123"}'

# Login with Basic Auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YWRtaW46eW91ci1zZWN1cmUtcGFzc3dvcmQ=" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

**Note:** `YWRtaW46eW91ci1zZWN1cmUtcGFzc3dvcmQ=` is base64 encoded `admin:your-secure-password`

### With JWT Token (After Login):
```bash
curl -X GET http://localhost:3000/api/some-protected-route \
  -H "Authorization: Bearer your-jwt-token-here"
```

## Implementation Details

### Files Modified:
1. **`src/main.ts`** - Added global prefix `/api`
2. **`src/common/guards/basic-auth.guard.ts`** - Basic auth validation guard
3. **`src/common/guards/jwt-auth.guard.ts`** - Updated to skip when basic auth is valid
4. **`src/common/guards/guards.module.ts`** - Registered BasicAuthGuard as global guard
5. **`src/app.module.ts`** - Added GuardsModule import

### Guard Priority:
1. BasicAuthGuard runs first (global guard)
2. If basic auth is valid, JWT guard skips validation
3. If basic auth is not provided, JWT guard validates normally

## Security Notes

- Basic Auth credentials are stored in environment variables
- Never commit `.env` file to version control
- Use strong passwords for `BASIC_AUTH_PASSWORD`
- **Basic Auth is REQUIRED** if env vars are set - ALL requests must include Basic Auth header
- If env vars are not set, basic auth is disabled (development mode)
- Basic Auth is checked FIRST, before JWT authentication
- JWT tokens still work normally after basic auth validation passes
