# Project Casino App

Production-oriented **sandbox** monorepo for a casino/betting platform.  
Uses **mock odds and mock payments** only — does **not** process real money.

## Features

- User register / login (HTTP-only session cookie)
- Wallet with mock deposit & withdrawal (integer USD cents + ledger)
- Open sports events with odds (seeded)
- Place bets with idempotency keys
- Bet history
- Sandbox settlement endpoint (admin key)
- Docker Compose: Postgres + Redis + API + Web

## No PC? Deploy from your phone

See **[DEPLOY.md](./DEPLOY.md)** — free Render/Railway steps using only a browser + GitHub.

## Quick start (PC with Docker)

```bash
cp .env.example .env
# SESSION_SECRET must be 32+ chars; set SANDBOX_ADMIN_KEY too
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web UI  | http://localhost:3000 |
| API health | http://localhost:3001/health |

### Try the flow

1. Open the Web UI  
2. Register a user  
3. Mock-deposit e.g. `$50`  
4. Select an outcome and place a bet  
5. (Optional) settle a bet:

```bash
curl -X POST "http://localhost:3001/sandbox/settlement/<BET_ID>/WON" \
  -H "x-sandbox-admin-key: $SANDBOX_ADMIN_KEY"
```

Outcomes: `WON` | `LOST` | `VOID`

## Stack

- `apps/web` — Next.js 14 (Pages Router) + TypeScript  
- `apps/api` — NestJS + Prisma + PostgreSQL  
- Redis reserved for future workers  

See [DEVELOPMENT.md](./DEVELOPMENT.md) and [DEPLOY.md](./DEPLOY.md).
