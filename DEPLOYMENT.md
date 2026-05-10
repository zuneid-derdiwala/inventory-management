# Deploying this app

You deploy the **static frontend** (Vite `dist/`). **Supabase** is already hosted. **Groq Chat** is optional: on **Vercel**, Edge handlers under `/api/` keep the API key off the client; a **Docker/nginx-only** image has no Groq backend unless you add one.

## Choose a path

| Path | Best for | You run |
|------|-----------|---------|
| **[A. Vercel](#a-vercel-recommended)** | Public site, CI from Git, free tier friendly | Build on Vercel; Supabase in cloud; optional Groq via `api/groq-*.ts` |
| **[B. Docker on a VPS](#b-docker-on-a-vps)** | Self-hosted SPA + nginx | `docker compose` on your VM |

---

## A) Vercel (recommended)

1. **Push** this repo to GitHub (or GitLab / Bitbucket).

2. **Import** the project in [Vercel](https://vercel.com/new): root directory = repo root, framework **Vite**, build `npm run build`, output **`dist`**.

3. **Environment variables** (Project → Settings → Environment Variables). At minimum:

   | Name | Notes |
   |------|--------|
   | `VITE_SUPABASE_URL` | Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

   Optional: `VITE_HCAPTCHA_SITE_KEY`. For **Chat** (`/chat`): `GROQ_API_KEY`, `GROQ_ENABLED=true` (or `VITE_GROQ_ENABLED=true`), and optional `GROQ_MODEL` — see [GROQ.md](./GROQ.md).

4. **Redeploy** after any env change (Deployments → … → Redeploy).

5. **Supabase Auth URLs** — Dashboard → Authentication → URL configuration:

   - **Site URL**: `https://your-app.vercel.app` (your production URL)
   - **Redirect URLs**: add the same origin plus paths your app uses, e.g.  
     `https://your-app.vercel.app/reset-password`  
     `https://your-app.vercel.app/verify-email`  
     (add preview URLs too if you use Preview deployments)

More detail: [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md).

---

## B) Docker on a VPS

Use when you want the **built SPA + nginx** only (see [`docker-compose.yml`](./docker-compose.yml) and [`Dockerfile`](./Dockerfile)). There is **no** Groq server in this image; leave `GROQ_ENABLED=false` for the build or expect Chat requests to `/api/groq-*` to fail unless you terminate TLS elsewhere and proxy to a real API.

1. **Server** with Docker Engine + Compose v2 (Ubuntu LTS, Hetzner, DigitalOcean, AWS EC2, etc.).

2. **Clone** the repo on the server and add **`.env`** at the repo root with at least `VITE_SUPABASE_*` for the client build.

3. **Build and run**:

   ```bash
   docker compose up -d --build
   ```

   - **Web UI**: port **8080** → nginx (adjust `docker-compose.yml` if you want 80).

4. **TLS / domain** — put **Caddy** or **nginx** on the host in front of `8080`, or change Compose to publish `80:80` and manage certs on the host.

5. **Firewall** — open only the ports you need (e.g. 80/443).

6. **Supabase** — set the production **Site URL** and **Redirect URLs** to your real domain (`https://inventory.example.com`, etc.).

---

## After deploy — quick checks

- [ ] Login / signup / password reset flows use your production URL in Supabase.
- [ ] No secrets in the client except **public** keys (`VITE_*`, anon key). **`GROQ_API_KEY` is not** a `VITE_` variable.
- [ ] `npm run build` passes locally before relying on CI (catches TypeScript / Vite errors).

## Mobile (Capacitor)

`android/` and `ios/` folders are for **store builds** (separate from Vercel). Build APK/IPA with Android Studio / Xcode when you are ready; that is not covered by the web deploy steps above.
