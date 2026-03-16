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

## Listings

### List listings (public)
**GET** `/api/listings`

Query parameters (optional): `platform`, `category`, `status` (draft | active | sold | archived), `page`, `limit`. Default status filter is `active` when not provided.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "sellerId": 1,
      "seller": { "id": 1, "username": "seller1" },
      "title": "YouTube channel",
      "platform": "youtube",
      "category": "gaming",
      "price": 5000,
      "status": "active",
      "viewCount": 0,
      "favoriteCount": 0,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### Get listing by ID (public for active; owner can see draft/archived)
**GET** `/api/listings/:id`

For non-owners, only listings with `status: "active"` are returned; otherwise 404. Pass optional JWT to be recognized as owner for draft/archived. View count is incremented for non-owner views.

### Get listing info from URL (public)
**GET** `/api/listings/info?url=...`

Fetches channel/profile metadata from the given URL (YouTube, Instagram, or TikTok), uploads the thumbnail image to your configured storage (AWS S3 or Cloudinary), and returns type, title, thumbnail (id, name, url), and subscribers.

**Query:** `url` (required) – full profile/channel URL (e.g. `https://www.youtube.com/channel/UCxxx` or `https://instagram.com/username`).

**Response (200 OK):**
```json
{
  "type": "youtube",
  "title": "Channel Name",
  "thumbnail": { "id": "listings/xxx", "name": "listings/xxx", "url": "https://..." },
  "subscribers": 10000
}
```

If thumbnail upload fails, `thumbnail` is `{ "id": null, "name": null, "url": null }`. Uses same env as verify: `YOUTUBE_API_KEY`, `APIFY_TOKEN` or `INSTAGRAM_API_KEY`. Thumbnails are stored in the `listings` folder via `StorageService.uploadImageFromUrl` (Cloudinary or S3 per `STORAGE_PROVIDER`).

### Verify listing link (public)
**POST** `/api/listings/verify`

Checks that the given verification code appears in the channel/profile description on the given platform. Use before or after creating a listing to prove ownership.

**Request Body:**
```json
{
  "verificationCode": "ABC123",
  "socialMedia": "youtube",
  "link": "https://www.youtube.com/channel/UCxxxx"
}
```

- **socialMedia:** `youtube` | `instagram` | `tiktok` | `facebook` (facebook always passes).
- **link:** Full profile/channel URL.

**Response (200 OK):** `{ "verified": true }`

**Error (400):** Verification code not found in channel/profile description, invalid URL, or platform not configured.

**Environment:** `YOUTUBE_API_KEY` for YouTube; `APIFY_TOKEN` or `APIFY_TOKEN` for Instagram/TikTok (Apify actors).

### Create listing (JWT required)
**POST** `/api/listings`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "My YouTube channel",
  "description": "Gaming content",
  "platform": "youtube",
  "category": "gaming",
  "link": "https://youtube.com/...",
  "price": 5000,
  "status": "draft",
  "monetizationAvailable": true,
  "displayLink": false,
  "allowComments": true
}
```

**Response (201 Created):** Created listing object.

### List my listings (JWT required)
**GET** `/api/listings/my`

Query parameters (optional): `status`, `page`, `limit`. Returns only the authenticated user's listings.

### Update listing (JWT required, owner only)
**PATCH** `/api/listings/:id`

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Any subset of create fields plus `isFeatured`, `featuredExpiresAt`.

**Response (200 OK):** Updated listing object.

### Delete listing (JWT required, owner only)
**DELETE** `/api/listings/:id`

**Headers:** `Authorization: Bearer <token>`

Soft-deletes the listing. **Response (200 OK):** `{ "message": "Listing deleted successfully" }`.

---

## Testing all Listing APIs (payloads & cURL)

Base URL: `http://localhost:3000/api` (or your server). For protected endpoints, get a JWT first via **POST /api/auth/login** → **POST /api/auth/verify-otp**, then use `Authorization: Bearer <TOKEN>`.

### 1. List listings (public)

**Request:** `GET /api/listings`  
**Query (optional):** `platform`, `category`, `status`, `page`, `limit`

| Param     | Example   | Description                          |
|----------|-----------|--------------------------------------|
| platform | youtube   | Filter by platform                   |
| category | gaming    | Filter by category                   |
| status   | active    | draft \| active \| sold \| archived  |
| page     | 1         | Page number (default 1)              |
| limit    | 20        | Items per page (default 20, max 50) |

**Payload (query string):** none required; optional: `?platform=youtube&status=active&page=1&limit=10`

```bash
curl -X GET "http://localhost:3000/api/listings?platform=youtube&status=active&page=1&limit=10"
```

**Expected (200):** `{ "data": [ { "id", "sellerId", "seller", "title", "platform", "category", "price", "status", "viewCount", "favoriteCount", "createdAt", "updatedAt" } ], "meta": { "total", "page", "limit", "totalPages" } }`

---

### 2. Get listing by ID (public)

**Request:** `GET /api/listings/:id`  
**Payload:** none (ID in path)

```bash
curl -X GET "http://localhost:3000/api/listings/1"
```

**Expected (200):** Single listing object (with `media` when available). 404 if not found or not active (and caller is not owner).

---

### 3. Get listing info from URL (public)

**Request:** `GET /api/listings/info`  
**Query (required):** `url` – full profile/channel URL

**Payload (query):** `?url=https://www.youtube.com/channel/UCxxxx` or `?url=https://instagram.com/username`

```bash
curl -X GET "http://localhost:3000/api/listings/info?url=https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"
```

**Expected (200):**
```json
{
  "type": "youtube",
  "title": "Channel Name",
  "thumbnail": { "id": "listings/xxx", "name": "listings/xxx", "url": "https://..." },
  "subscribers": 10000
}
```

---

### 4. Verify listing link (public)

**Request:** `POST /api/listings/verify`  
**Payload (body):**

| Field             | Type   | Required | Description                                      |
|-------------------|--------|----------|--------------------------------------------------|
| verificationCode  | string | yes      | Code that must appear in channel/profile text   |
| socialMedia       | string | yes      | `youtube` \| `instagram` \| `tiktok` \| `facebook` |
| link              | string | yes      | Full profile/channel URL                         |

**Example body:**
```json
{
  "verificationCode": "ABC123",
  "socialMedia": "youtube",
  "link": "https://www.youtube.com/channel/UCxxxx"
}
```

```bash
curl -X POST "http://localhost:3000/api/listings/verify" \
  -H "Content-Type: application/json" \
  -d '{"verificationCode":"ABC123","socialMedia":"youtube","link":"https://www.youtube.com/channel/UCxxxx"}'
```

**Expected (200):** `{ "verified": true }`  
**Expected (400):** `{ "statusCode": 400, "message": "Verification code not found in channel description" }`

---

### 5. Create listing (JWT required)

**Request:** `POST /api/listings`  
**Headers:** `Authorization: Bearer <JWT>`

**Payload (body):**

| Field                  | Type    | Required | Description                    |
|------------------------|---------|----------|--------------------------------|
| title                  | string  | yes      | Max 255 chars                  |
| platform               | string  | yes      | e.g. youtube, instagram       |
| price                  | number  | yes      | ≥ 0                            |
| description            | string  | no       |                                |
| category               | string  | no       | Max 50 chars                   |
| link                   | string  | no       | Valid URL                      |
| status                 | string  | no       | Default draft                  |
| subscribers            | number  | no       | ≥ 0                            |
| monthlyViews           | number  | no       | ≥ 0                            |
| monthlyIncome          | number  | no       | ≥ 0                            |
| monthlyExpense         | number  | no       | ≥ 0                            |
| monetizationAvailable  | boolean | no       | Default false                   |
| displayLink            | boolean | no       | Default false                   |
| allowComments          | boolean | no       | Default true                    |
| audienceCountry        | string  | no       | Max 50 chars                   |

**Example body:**
```json
{
  "title": "My YouTube channel",
  "description": "Gaming content",
  "platform": "youtube",
  "category": "gaming",
  "link": "https://www.youtube.com/channel/UCxxxx",
  "price": 5000,
  "status": "draft",
  "subscribers": 10000,
  "monthlyViews": 50000,
  "monetizationAvailable": true,
  "displayLink": false,
  "allowComments": true,
  "audienceCountry": "US"
}
```

```bash
curl -X POST "http://localhost:3000/api/listings" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"title":"My YouTube channel","description":"Gaming content","platform":"youtube","category":"gaming","link":"https://www.youtube.com/channel/UCxxxx","price":5000,"status":"draft","monetizationAvailable":true,"displayLink":false,"allowComments":true}'
```

**Expected (201):** Created listing object (id, sellerId, seller, title, platform, category, link, price, status, viewCount, favoriteCount, createdAt, updatedAt, etc.).

---

### 6. List my listings (JWT required)

**Request:** `GET /api/listings/my`  
**Headers:** `Authorization: Bearer <JWT>`  
**Query (optional):** `status`, `page`, `limit`

**Payload (query):** e.g. `?status=draft&page=1&limit=20`

```bash
curl -X GET "http://localhost:3000/api/listings/my?status=draft&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Expected (200):** Same shape as list listings: `{ "data": [ ... ], "meta": { "total", "page", "limit", "totalPages" } }` (only current user’s listings).

---

### 7. Update listing (JWT required, owner only)

**Request:** `PATCH /api/listings/:id`  
**Headers:** `Authorization: Bearer <JWT>`  
**Payload (body):** Any subset of create-listing fields plus `isFeatured`, `featuredExpiresAt` (ISO date string).

**Example body:**
```json
{
  "title": "Updated channel title",
  "status": "active",
  "price": 5500,
  "isFeatured": false
}
```

```bash
curl -X PATCH "http://localhost:3000/api/listings/1" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated channel title","status":"active","price":5500}'
```

**Expected (200):** Updated listing object. 403 if not owner; 404 if listing not found.

---

### 8. Delete listing (JWT required, owner only)

**Request:** `DELETE /api/listings/:id`  
**Headers:** `Authorization: Bearer <JWT>`  
**Payload:** none

```bash
curl -X DELETE "http://localhost:3000/api/listings/1" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Expected (200):** `{ "message": "Listing deleted successfully" }`  
**Expected (403):** Not owner. **Expected (404):** Listing not found.

---

## Listing Subscriptions (Saved Searches)

These endpoints let a user subscribe to notifications for new listings that match certain criteria (price, platform, category, audience country, etc.). Daily digests are sent via email by a background job.

Base path: `/api/listing-subscriptions`  
Auth: **JWT required** for all endpoints in this section.

### 1. Create listing subscription (JWT required)

**POST** `/api/listing-subscriptions`

Creates a new saved search / subscription for the authenticated user.

**Headers:**
- `Authorization: Bearer <JWT>`

**Request Body:**

All fields are optional; unspecified filters are treated as "no filter" for that field.

| Field           | Type   | Required | Description                                               |
|-----------------|--------|----------|-----------------------------------------------------------|
| name            | string | no       | Friendly name for the subscription (max 100 chars)       |
| frequency       | string | no       | `DAILY` \| `WEEKLY` (default: `DAILY`)                    |
| channel         | string | no       | `EMAIL` \| `PUSH` (currently only EMAIL is used)         |
| minPrice        | number | no       | Minimum listing price (>= 0)                             |
| maxPrice        | number | no       | Maximum listing price (>= 0)                             |
| monetization    | string | no       | Monetization type (e.g. `subscription`, `one_time`, etc) |
| platform        | string | no       | Platform filter (e.g. `youtube`, `instagram`)            |
| category        | string | no       | Category filter (e.g. `gaming`, `education`)             |
| audienceCountry | string | no       | Audience country code/name (max 50 chars)                |

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/listing-subscriptions" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "YouTube gaming under $5k",
    "frequency": "DAILY",
    "channel": "EMAIL",
    "minPrice": 0,
    "maxPrice": 5000,
    "platform": "youtube",
    "category": "gaming",
    "audienceCountry": "US"
  }'
```

**Success (201 Created):**

```json
{
  "id": 1,
  "userId": 123,
  "name": "YouTube gaming under $5k",
  "status": "ACTIVE",
  "frequency": "DAILY",
  "channel": "EMAIL",
  "minPrice": 0,
  "maxPrice": 5000,
  "monetization": null,
  "platform": "youtube",
  "category": "gaming",
  "audienceCountry": "US",
  "lastRunAt": null,
  "lastEmailSentAt": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "cancelledAt": null
}
```

**Error Responses:**
- `400 Bad Request` – validation error (e.g. negative price, invalid enum)
- `401 Unauthorized` – missing/invalid JWT

---

### 2. List my listing subscriptions (JWT required)

**GET** `/api/listing-subscriptions/me`

Returns all listing subscriptions for the authenticated user, ordered by `createdAt` (newest first).

**Headers:**
- `Authorization: Bearer <JWT>`

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/listing-subscriptions/me" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Success (200 OK):**

```json
[
  {
    "id": 1,
    "userId": 123,
    "name": "YouTube gaming under $5k",
    "status": "ACTIVE",
    "frequency": "DAILY",
    "channel": "EMAIL",
    "minPrice": 0,
    "maxPrice": 5000,
    "monetization": null,
    "platform": "youtube",
    "category": "gaming",
    "audienceCountry": "US",
    "lastRunAt": "2025-01-02T01:00:00.000Z",
    "lastEmailSentAt": "2025-01-02T01:00:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-02T01:00:00.000Z",
    "cancelledAt": null
  }
]
```

**Error Responses:**
- `401 Unauthorized` – missing/invalid JWT

---

### 3. Update listing subscription (JWT required, owner only)

**PATCH** `/api/listing-subscriptions/:id`

Updates a subscription’s filters and/or status. Any subset of the create fields is allowed, plus `status`.

**Headers:**
- `Authorization: Bearer <JWT>`

**Path Params:**
- `id` – subscription ID (integer)

**Request Body (partial):**

Same fields as create, plus:

| Field  | Type   | Required | Description                                      |
|--------|--------|----------|--------------------------------------------------|
| status | string | no       | `ACTIVE` \| `PAUSED` \| `CANCELLED`              |

**Example Request:**

```bash
curl -X PATCH "http://localhost:3000/api/listing-subscriptions/1" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "YouTube gaming under $10k",
    "maxPrice": 10000,
    "status": "ACTIVE"
  }'
```

**Success (200 OK):**

Returns the updated subscription object.

**Error Responses:**
- `400 Bad Request` – invalid body
- `401 Unauthorized` – missing/invalid JWT
- `403 Forbidden` – subscription does not belong to current user
- `404 Not Found` – subscription with given ID does not exist

---

### 4. Pause / resume / cancel subscription (JWT required, owner only)

These convenience endpoints change only the `status` (and `cancelledAt` for cancel).

#### Pause

**PATCH** `/api/listing-subscriptions/:id/pause`

Sets `status` to `PAUSED`.

```bash
curl -X PATCH "http://localhost:3000/api/listing-subscriptions/1/pause" \
  -H "Authorization: Bearer YOUR_JWT"
```

#### Resume

**PATCH** `/api/listing-subscriptions/:id/resume`

Sets `status` to `ACTIVE`.

```bash
curl -X PATCH "http://localhost:3000/api/listing-subscriptions/1/resume" \
  -H "Authorization: Bearer YOUR_JWT"
```

#### Cancel

**PATCH** `/api/listing-subscriptions/:id/cancel`

Sets `status` to `CANCELLED` and records `cancelledAt`.

```bash
curl -X PATCH "http://localhost:3000/api/listing-subscriptions/1/cancel" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Success (200 OK):**

In all three cases, returns the updated subscription.

**Error Responses (all three):**
- `401 Unauthorized` – missing/invalid JWT
- `403 Forbidden` – subscription does not belong to current user
- `404 Not Found` – subscription not found

---

### Quick test order (listings)

1. **GET /api/listings** – list active listings.  
2. **GET /api/listings/info?url=...** – get info + thumbnail from URL.  
3. **POST /api/listings/verify** – verify code in profile/channel.  
4. **POST /api/listings** (with JWT) – create listing.  
5. **GET /api/listings/my** (with JWT) – list own listings.  
6. **GET /api/listings/1** – get one listing.  
7. **PATCH /api/listings/1** (with JWT) – update own listing.  
8. **DELETE /api/listings/1** (with JWT) – soft-delete own listing.

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
