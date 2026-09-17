# Development

## Docker (recommended)

```bash
cp .env.example .env
# Edit SESSION_SECRET (>=32 chars) and SANDBOX_ADMIN_KEY
docker compose up --build
```

## Local (API only against Docker Postgres)

```bash
docker compose up -d postgres redis
cp .env.example .env
# Point DATABASE_URL at localhost:
# DATABASE_URL=postgresql://casino:casino@localhost:5432/casino?schema=public
cd apps/api && npm install && npx prisma generate && npx prisma db push && npx tsx prisma/seed.ts
npm run dev
```

Web:

```bash
cd apps/web && npm install && npm run dev
```

## API contracts

- Mutations require header `Idempotency-Key` (8–200 chars: letters, numbers, `. _ : -`)
- Settlement requires header `x-sandbox-admin-key` matching `SANDBOX_ADMIN_KEY`
- Auth cookie name: `casino_session` (HTTP-only)

This repo is **not** approved for real-money use.
