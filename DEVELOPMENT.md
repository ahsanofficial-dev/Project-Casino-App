# Development validation

```bash
cp .env.example .env
npm install
npm run db:generate
npm run build

docker compose up --build
```

All mutation endpoints require an `Idempotency-Key` header. Keys must be 8–200 characters and contain only letters, numbers, `.`, `_`, `:`, or `-`.

The settlement endpoint is sandbox-only and requires `x-sandbox-admin-key`. Never expose that key to the browser or commit it to source control.

This repository is not approved for real-money use. `prisma db push` is retained only for the disposable sandbox startup flow; production must use reviewed, versioned Prisma migrations and a controlled deployment process.
