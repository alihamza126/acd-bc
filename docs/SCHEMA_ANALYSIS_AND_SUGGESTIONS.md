# Account Deal App — Database Schema Analysis & Suggestions

## Base schema file
- Your original DBML-style base schema is saved in `docs/DB_SCHEMA_BASE_DESIGN.dbml`.

## Stack context
- **Backend:** NestJS
- **DB:** PostgreSQL
- **Real-time:** Socket.IO
- **Cache / sessions:** Redis
- **Push:** Firebase Cloud Messaging (FCM)

---

## 1. Schema strengths

- **UUID PKs** — Good for distributed systems and no sequential leakage.
- **Soft deletes** on `users`, `listings`, `listing_comments` — Keeps history and referential integrity.
- **RBAC** — Normalized `roles` / `permissions` / `role_permissions` / `user_roles` is clear and flexible.
- **Deal audit trail** — `deal_events` with `from_status` / `to_status` / `metadata` supports compliance and debugging.
- **KYC events** — `user_kyc_events` with `raw_payload` (jsonb) is good for auditing.
- **Chat** — Participants, last read/delivered, reactions, attachments, replies — structure is solid.

---

## 2. Suggested schema additions

### 2.1 Firebase / push notifications (required for your stack)

You mentioned Firebase push; the schema has no place for device tokens or in-app notifications.

```sql
-- FCM (and optionally APNs) tokens per device
Table notification_tokens {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  device_id uuid  // optional: link to user_devices.id
  token varchar [not null]
  platform varchar(10) [not null]  // 'android' | 'ios' | 'web'
  is_active boolean [not null, default: true]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    user_id
    (user_id, token) [unique]
  }
}

-- In-app notification log (for “mark as read” and history)
Table notifications {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  type varchar(50) [not null]   // 'deal_update', 'new_message', 'listing_comment', etc.
  title varchar(255)
  body text
  data jsonb                    // deep link / payload for client
  read_at timestamp
  created_at timestamp [not null, default: `now()`]

  indexes {
    user_id
    (user_id, read_at, created_at)
  }
}
```

**Refs:**  
`notification_tokens.user_id` → `users.id`  
`notifications.user_id` → `users.id`

### 2.2 Escrow clarity

`deals.escrow_id` references `users.id`. If escrow is an internal “escrow user” or bot, that’s fine. If you integrate external escrow services later, consider:

- Either keep `escrow_id` as “escrow handler user” and add something like `deals.escrow_provider varchar(50)` and `deals.escrow_external_id varchar` for external systems,
- Or introduce an `escrow_providers` table and point `deals` to it (and optionally to a user for internal escrow).

For a first version, keeping `escrow_id` → `users.id` is acceptable; add provider/external id when you integrate real escrow.

---

## 3. Index suggestions (performance & analyses)

These support common queries and “efficient analyses” without changing the logical model.

| Table | Suggested index | Purpose |
|-------|-----------------|--------|
| `listings` | `(seller_id, status)` | Seller’s listings by status |
| `listings` | `(status, created_at)` | Public listing feed, newest first |
| `listings` | `(platform, category, status)` | Filtered discovery |
| `listing_media` | `(listing_id)` | Already implied by FK; add only if you see full scans |
| `listing_comments` | `(listing_id, created_at)` | Paginated comments |
| `listing_comments` | `(parent_id)` | Thread replies |
| `deals` | `(buyer_id, status)`, `(seller_id, status)` | “My deals” by side and status |
| `deals` | `(listing_id)` | Deals for a listing |
| `deals` | `(status, created_at)` | Admin / analytics lists |
| `deal_events` | `(deal_id, created_at)` | Event timeline |
| `deal_disputes` | `(deal_id)`, `(status)` | Dispute lookup and queues |
| `payments` | `(deal_id)`, `(payer_id, created_at)` | Payments per deal / per user |
| `chat_rooms` | `(last_message_at)` | Sort “recent chats” |
| `chat_room_participants` | `(user_id, chat_room_id)` [unique] | “My rooms” and prevent duplicate join |
| `chat_messages` | `(chat_room_id, created_at)` | Pagination in a room |
| `user_kyc` | `(user_id, status)` | KYC status per user |
| `auth_tokens` | Already have `(user_id, type)` | Good |

### Chat reactions uniqueness

Prevent duplicate “same user, same emoji on same message”:

- Unique index: `(message_id, user_id, emoji)` on `chat_message_reactions`.

---

## 4. PostgreSQL enums (optional but recommended)

Replacing free-form `varchar` with enums improves consistency and can help performance and validation.

Examples:

- `users.status`: `unverified | active | suspended | banned`
- `listings.status`: `draft | active | paused | closed`
- `deals.type`: `sale | lease` (or whatever your domain uses)
- `deals.status`: e.g. `pending_payment | paid | in_escrow | completed | cancelled | disputed`
- `payments.status`: `pending | confirming | confirmed | failed | refunded`
- `user_presence.status`: `online | away | offline`
- `chat_messages.type`: `text | image | file | system`

Define these in migrations and use the same enums in NestJS (e.g. shared constants or TypeScript enums) so DB and app stay in sync.

---

## 5. Redis usage (efficient real-time & analyses)

- **Presence** — Mirror `user_presence`-style data in Redis (e.g. `user:{id}:presence` with status, last_seen, socket_id). Use Redis as source of truth for “online now”; optionally sync to Postgres periodically or on disconnect.
- **Socket.IO** — Use Redis adapter (`@socket.io/redis-adapter`) so multiple NestJS instances share rooms and broadcasts.
- **Rate limiting** — Store attempt counts or sliding windows in Redis (auth, API, chat).
- **Hot counters** — e.g. “unread count” per user or per room can be cached in Redis and invalidated on new message / read.
- **Analyses** — For heavy dashboards (e.g. deal volume by day, revenue by seller), consider:
  - Pre-aggregated tables or materialized views in Postgres, refreshed by cron or event-driven jobs,
  - Or caching query results in Redis with TTL.

---

## 6. Socket.IO events (align with schema)

- **Deals:** `deal:status_changed`, `deal:payment_received`, `deal:dispute_opened` — update `last_socket_updated_at` when you broadcast.
- **Chat:** `message:new`, `message:edited`, `message:deleted`, `typing:start` / `typing:stop`, `reaction:add` / `reaction:remove`.
- **Presence:** `presence:online` / `presence:offline` / `presence:away` (backed by Redis).
- **Listings:** `listing:comment`, `listing:favorite` (if you need real-time counters or live activity).

---

## 7. Firebase push (when to send)

- **Deal lifecycle:** status changes, payment received, dispute opened/updated.
- **Chat:** new message in a room (with optional in-app notification row in `notifications`).
- **Listings:** new comment, or when a listing of interest gets an offer (if you add “watched” listings).
- **KYC:** verification result.

Store FCM tokens in `notification_tokens`, and optionally link to `user_devices` for “notify this device only” or per-device preferences.

---

## 8. Soft deletes & referential integrity

- You already use `deleted_at` on users, listings, comments. For **deals**, consider soft delete as well (`cancelled_at` is there; you can add `deleted_at` for hard-hide while keeping referential integrity and audit).
- In NestJS, use a global scope or repository pattern so all queries for “active” entities filter `deleted_at IS NULL` by default.

---

## 9. Summary checklist before implementation

- [ ] Add `notification_tokens` and `notifications` (and FKs to `users`).
- [ ] Add indexes from Section 3 where they match your query patterns.
- [ ] Add unique index on `chat_message_reactions (message_id, user_id, emoji)`.
- [ ] (Optional) Introduce PostgreSQL enums for status/type fields and use them in NestJS.
- [ ] Plan Redis: presence, Socket.IO adapter, rate limiting, optional cache for heavy analytics.
- [ ] Plan Socket.IO events and which tables to update on real-time events (e.g. `last_socket_updated_at`, `last_message_at`).
- [ ] Clarify escrow model (user vs external provider) and add fields only when needed.

Once these are decided, we can start building the NestJS backend (modules, TypeORM/Prisma entities, migrations, Socket.IO gateway, Redis, and FCM integration) step by step.
