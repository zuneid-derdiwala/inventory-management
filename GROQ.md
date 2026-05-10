# Chat with Groq (free tier)

The **Chat** page (`/chat`) calls **[Groq](https://groq.com)** using the OpenAI-compatible API. Your **`GROQ_API_KEY` never ships to the browser**: the dev server injects it into the `/groq-proxy` hop, and production uses Vercel Edge routes under `/api/`.

Each message sends a **system summary** built from your in-memory inventory (`DataContext` / same rows as the Entry form): counts by seller, brand/model, sold vs in stock, monthly inward totals, and revenue sums from outward amounts. **IMEIs are not included** in that text.

## Setup (local)

1. Create an API key at [console.groq.com](https://console.groq.com).
2. In **`.env`** (repo root):

   ```env
   GROQ_API_KEY=gsk_...
   GROQ_ENABLED=true
   GROQ_MODEL=llama-3.1-8b-instant
   ```

   You can use **`VITE_GROQ_ENABLED`** / **`VITE_GROQ_MODEL`** instead if you prefer; `vite.config.ts` merges `GROQ_ENABLED` and `GROQ_MODEL` into the client build.

3. **`npm run dev`** → open **`/chat`**.

If the key is missing or invalid, “List models” or sending a message will show Groq’s error text.

## Production (Vercel)

Add the same variables in the Vercel project settings:

- **`GROQ_API_KEY`** (required for Chat)
- **`GROQ_ENABLED=true`** or **`VITE_GROQ_ENABLED=true`** (must be true at **build** time so the UI enables Chat)
- **`GROQ_MODEL`** or **`VITE_GROQ_MODEL`** (optional; default `llama-3.1-8b-instant`)

Redeploy after changing env vars.

## Plain static hosting (nginx / S3 / Docker SPA only)

There is **no** server to attach `GROQ_API_KEY` to. Chat will not work unless you add your own backend that proxies to Groq (same idea as `api/groq-chat.ts` on Vercel).

## Security

- **Do not** prefix the API key with `VITE_` — that would bundle it into client JavaScript.
- If a key was ever pasted into chat, a ticket, or git history, **revoke it** in the Groq console and create a new one.

## Code

| File | Purpose |
|------|---------|
| [`src/lib/groq.ts`](./src/lib/groq.ts) | Client calls (URLs only; no secret) |
| [`src/components/ChatPanel.tsx`](./src/components/ChatPanel.tsx) | Chat UI |
| [`vite.config.ts`](./vite.config.ts) | Dev/preview **`/groq-proxy`** + build-time Groq flags |
| [`api/groq-chat.ts`](./api/groq-chat.ts) | Vercel Edge: `POST` → Groq chat completions |
| [`api/groq-models.ts`](./api/groq-models.ts) | Vercel Edge: `GET` → Groq models list |
