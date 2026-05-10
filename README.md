# inventory-management
Inventory Management

## Deploy

- **Vercel (recommended):** [DEPLOYMENT.md](./DEPLOYMENT.md) → section A  
- **Docker on a VPS:** same doc → section B  
- **Env vars on Vercel:** [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)

## Chat (Groq)

**Chat** on `/chat` uses the [Groq](https://groq.com) free tier. Set `GROQ_API_KEY`, `GROQ_ENABLED=true`, and optional `GROQ_MODEL` in `.env`, then `npm run dev`. See [GROQ.md](./GROQ.md) (Vercel Edge routes in production; plain Docker/nginx static builds do not include the Groq proxy).
