# Development validation

```bash
cp .env.example .env
# Edit SESSION_SECRET and SANDBOX_ADMIN_KEY (32+ random chars each)
npm install
npm run db:generate
npm run build

docker compose up --build
```

- Web: http://localhost:3000
- API health: http://localhost:3001/health

## API notes

All mutation endpoints require an `Idempotency-Key` header.  
Keys must be 8–200 characters and contain only letters, numbers, `.`, `_`, `:`, or `-`.

The settlement endpoint is sandbox-only and requires `x-sandbox-admin-key`.  
Never expose that key to the browser or commit it to source control.

```bash
# Example mock deposit (after login cookie is set)
curl -X POST http://localhost:3001/wallet/mock-deposit \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: deposit-demo-001' \
  -H 'Cookie: casino_session=...' \
  -d '{"amountCents":5000}'
```

This repository is not approved for real-money use. `prisma db push` is retained only for the disposable sandbox startup flow; production must use reviewed, versioned Prisma migrations and a controlled deployment process.
