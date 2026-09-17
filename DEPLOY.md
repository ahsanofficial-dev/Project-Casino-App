# Run without a PC (phone / tablet)

You can host this sandbox on a free cloud account from a browser.

## Option A — Render (recommended, free tier)

1. Open [https://render.com](https://render.com) and sign up (GitHub login works).
2. **New → Blueprint** → connect `ahsanofficial-dev/Project-Casino-App`.
3. Render reads `render.yaml` and creates:
   - Postgres (`casino-db`)
   - API service (`casino-api`)
   - Web service (`casino-web`)
4. After the **API** is live, copy its URL (e.g. `https://casino-api-xxxx.onrender.com`).
5. In the **Web** service env vars set:
   - `NEXT_PUBLIC_API_URL` = that API URL (no trailing slash)
6. In the **API** service env vars set:
   - `WEB_ORIGIN` = your Web URL (e.g. `https://casino-web-xxxx.onrender.com`)
7. **Manual Deploy** both services again so the web build picks up the API URL.

Then open the **Web** URL on your phone and use register → deposit → bet.

> Free Render services sleep after inactivity; the first request may take ~30–60s.

## Option B — Railway

1. [https://railway.app](https://railway.app) → Login with GitHub  
2. **New Project → Deploy from GitHub** → this repo  
3. Add a **PostgreSQL** plugin  
4. Deploy `apps/api` (Dockerfile path `apps/api/Dockerfile`, context `apps/api`)  
5. Set env: `DATABASE_URL` (from Postgres), `SESSION_SECRET`, `SANDBOX_ADMIN_KEY`, `WEB_ORIGIN`, `API_PORT=3001`  
6. Deploy `apps/web` with build-arg / env `NEXT_PUBLIC_API_URL` = API public URL  

## Local PC later

```bash
cp .env.example .env
# set SESSION_SECRET (32+ chars) and SANDBOX_ADMIN_KEY
docker compose up --build
```

- Web: http://localhost:3000  
- API: http://localhost:3001/health  

Still **mock money only** — not for real payments.
