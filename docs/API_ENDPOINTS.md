# API Endpoints - Testing Guide

## Base URL
```
http://localhost:3000/api
```

## Authentication

All endpoints are prefixed with `/api`. Some endpoints may require Basic Auth or JWT Bearer token.

---

## Public Endpoints

### 1. User Registration
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (201 Created):**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "uuid-string"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
  }'
```

**With Basic Auth (optional):**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
  }'
```

---

### 2. User Login
**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "status": "active"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**With Basic Auth (optional):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `401 Unauthorized` - Account locked (after 5 failed attempts)
- `401 Unauthorized` - Account deleted

---

### 3. Email Verification
**GET** `/api/auth/verify-email`

Verify email address using verification token sent via email.

**Query Parameters:**
- `token` (required) - Verification token from email

**Response (200 OK):**
```json
{
  "message": "Email verified successfully"
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/auth/verify-email?token=your-verification-token-here"
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token
- `400 Bad Request` - Email already verified

---

## Protected Endpoints

These endpoints require JWT Bearer token authentication.

### Using JWT Token:
```bash
curl -X GET http://localhost:3000/api/protected-endpoint \
  -H "Authorization: Bearer your-jwt-token-here"
```

---

## Basic Authentication

If `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set in `.env`, you can use Basic Auth:

**Encode credentials:**
```bash
# Format: username:password
echo -n "admin:password" | base64
# Output: YWRtaW46cGFzc3dvcmQ=
```

**Use in requests:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

---

## Testing Workflow

### 1. Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123"
  }'
```

**Expected:** 
- Status: `201 Created`
- Email verification email sent
- User created with `unverified` status

---

### 2. Verify Email
Check your email for verification link, or use the token from the registration response.

```bash
curl "http://localhost:3000/api/auth/verify-email?token=VERIFICATION_TOKEN_FROM_EMAIL"
```

**Expected:**
- Status: `200 OK`
- User status changed to `active`
- Email marked as verified

---

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

**Expected:**
- Status: `200 OK`
- Returns `accessToken` and user info
- Login success email sent with device details

**Save the token:**
```bash
TOKEN="your-access-token-here"
```

---

### 4. Test Account Lock (5 Failed Attempts)
```bash
# Attempt 1-5 with wrong password
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPassword"
    }'
  echo ""
done
```

**Expected:**
- Attempts 1-4: `401 Unauthorized` - "Invalid email or password"
- Attempt 5: `401 Unauthorized` - "Account is locked. Try again in 30 minutes"
- Account locked email sent

---

### 5. Use Protected Endpoints (Future)
```bash
curl -X GET http://localhost:3000/api/protected-endpoint \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Responses

### Common Error Codes:

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

**409 Conflict**
```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "error": "Conflict"
}
```

---

## Postman Collection

### Environment Variables
Create a Postman environment with:
- `base_url`: `http://localhost:3000/api`
- `token`: (set after login)
- `basic_auth`: `Basic YWRtaW46cGFzc3dvcmQ=` (if using Basic Auth)

### Collection Structure
1. **Auth**
   - Register User
   - Verify Email
   - Login
   - Login (with Basic Auth)

---

## Testing Checklist

- [ ] Register new user
- [ ] Verify email with token
- [ ] Login with correct credentials
- [ ] Login with wrong password (test failed attempts)
- [ ] Test account lock (5 failed attempts)
- [ ] Verify email notifications are sent:
  - [ ] Registration verification email
  - [ ] Login success email
  - [ ] Account locked email
- [ ] Test Basic Auth (if configured)
- [ ] Test JWT token authentication

---

## Notes

1. **Email Verification:** Check your email inbox (and spam folder) for verification emails
2. **Account Lock:** Account unlocks automatically after 30 minutes
3. **JWT Token:** Tokens expire after 7 days (configurable)
4. **Basic Auth:** Optional - only works if env vars are set
5. **API Prefix:** All endpoints are prefixed with `/api`

---

## Quick Test Script

Save as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"
EMAIL="test@example.com"
USERNAME="testuser"
PASSWORD="TestPass123"

echo "1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

echo "$REGISTER_RESPONSE" | jq '.'

echo -e "\n2. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
echo "Token: $TOKEN"

echo -e "\n3. Testing with token..."
curl -s -X GET "$BASE_URL/some-endpoint" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

Make executable:
```bash
chmod +x test-api.sh
./test-api.sh
```
