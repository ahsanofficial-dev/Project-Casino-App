# Project Casino App

Production-oriented **sandbox** monorepo for a casino/betting platform.  
This repository intentionally uses **mock odds and mock payments** and does **not** process real money.

## Stack

- `apps/web`: Next.js (Pages Router) + TypeScript
- `apps/api`: NestJS + TypeScript
- PostgreSQL + Prisma
- Redis (present for future BullMQ workers)
- Integer minor-unit money values (USD cents)
- HTTP-only session-cookie authentication
- Transactional wallet ledger + idempotency model

## Run locally

```bash
cp .env.example .env
# Set SESSION_SECRET and SANDBOX_ADMIN_KEY to long random values
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web     | http://localhost:3000 |
| API     | http://localhost:3001/health |

## Important

This is a sandbox architecture. Mock deposits, withdrawals, odds, settlement, KYC, geolocation, and responsible-gaming controls are **not** production integrations. Do not connect real payment or betting providers without jurisdictional compliance, legal review, security review, and provider webhook verification.

See [DEVELOPMENT.md](./DEVELOPMENT.md) for build steps and API notes.
