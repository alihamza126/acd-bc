# ACD Backend

NestJS API with PostgreSQL (Prisma), Redis, and BullMQ.

## Environment

Copy `.env.example` to `.env` and set:

- **DATABASE_URL** – PostgreSQL connection string
- **JWT_SECRET** – Secret for JWT signing
- **REDIS_URL** – Redis connection (e.g. `redis://localhost:6379`). Used for:
  - Auth token and OTP cache (with DB fallback if Redis is unavailable)
  - BullMQ queues (notifications). If omitted, queue workers use `localhost:6379`.

## Redis & queues

- **RedisService** (`src/common/services/redis.service.ts`) – Connects using `REDIS_URL` on module init; exposes `get`/`set`/`del` with optional TTL. If `REDIS_URL` is not set, Redis is disabled and token storage uses DB only.
- **AuthTokenStoreService** – Stores email verification, login OTP, and 2FA session keys in Redis with TTL; falls back to DB for lookup when Redis misses or is down.
- **QueueModule** – BullMQ with a `notifications` queue and `NotificationsProcessor`. Use `NotificationsQueueService` to add jobs (e.g. `addEmailJob`). Scalable-ready (add more workers or Redis adapter as needed).

## Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```
