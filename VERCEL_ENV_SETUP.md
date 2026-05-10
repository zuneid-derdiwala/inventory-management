# Vercel Environment Variables Setup

This guide explains how to configure environment variables in Vercel for your inventory management application.

## Deployment overview

| Piece | How it deploys |
|--------|----------------|
| **Frontend** | Static build (`npm run build` → `dist/`). Connect the Git repo to [Vercel](https://vercel.com); each push can auto-deploy. `vercel.json` SPA rewrites send all routes to `index.html`. |
| **Backend / DB** | [Supabase](https://supabase.com) (hosted). You only configure URLs and the anon key in Vercel env vars. |
| **Auth redirects** | In Supabase Dashboard → Authentication → URL configuration, add your production site URL (e.g. `https://your-domain.vercel.app`) and paths like `/reset-password`, `/verify-email`. |
| **Groq (Chat)** | Chat calls **`/api/groq-chat`** and **`/api/groq-models`** (Vercel Edge). Set **`GROQ_API_KEY`** in Vercel (server only). Enable the UI with **`GROQ_ENABLED=true`** or **`VITE_GROQ_ENABLED=true`** at **build** time. Details: [GROQ.md](./GROQ.md). |

Deploy command locally (same as CI): `npm run build`, then upload `dist/` or let Vercel run that on build.

## Required Environment Variables

Your application needs the following environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Step-by-Step Setup

### 1. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **anon/public key** → This is your `VITE_SUPABASE_ANON_KEY`

### 2. Add Environment Variables in Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Click **Add New** for each variable:

   **Variable 1:**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://your-project-id.supabase.co` (your actual Supabase URL)
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 2:**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your actual anon key)
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

#### Option B: Via Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link your project (if not already linked):
   ```bash
   vercel link
   ```

4. Add environment variables:
   ```bash
   # Add Supabase URL
   vercel env add VITE_SUPABASE_URL production
   # When prompted, paste your Supabase URL
   
   # Add Supabase Anon Key
   vercel env add VITE_SUPABASE_ANON_KEY production
   # When prompted, paste your Supabase anon key
   
   # Repeat for preview and development environments if needed
   vercel env add VITE_SUPABASE_URL preview
   vercel env add VITE_SUPABASE_ANON_KEY preview
   vercel env add VITE_SUPABASE_URL development
   vercel env add VITE_SUPABASE_ANON_KEY development
   ```

### 3. Redeploy Your Application

After adding environment variables, you need to redeploy:

1. **Via Dashboard:**
   - Go to your project's **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger a new deployment

2. **Via CLI:**
   ```bash
   vercel --prod
   ```

### 4. Verify Environment Variables

After deployment, verify that the environment variables are working:

1. Open your deployed application
2. Open browser console (F12)
3. Look for the message: `"Supabase configured successfully"`
4. If you see warnings about missing environment variables, the variables weren't set correctly

## Important Notes

### Vite environment variables

- **`VITE_*`**: Standard Vite client variables (e.g. Supabase).
- **`GROQ_*` / `VITE_GROQ_*`**: Chat uses `vite.config.ts` **define** so `GROQ_ENABLED` / `GROQ_MODEL` (or `VITE_*` equivalents) are available to the client at build time. **`GROQ_API_KEY` is never `VITE_`** — it is only read by the dev proxy and by **`api/groq-chat.ts`** / **`api/groq-models.ts`** on Vercel.
- **Build time**: Values are baked in at `npm run build` / Vercel build — change env in Vercel, then **redeploy**.

### Groq in production (optional)

If Chat is enabled on Vercel:

1. Set **`GROQ_API_KEY`** for Production (and Preview if you want Chat there).
2. Set **`GROQ_ENABLED=true`** (or **`VITE_GROQ_ENABLED=true`**) so the build includes a enabled Chat UI.
3. Optional **`GROQ_MODEL`** / **`VITE_GROQ_MODEL`** (default `llama-3.1-8b-instant`).

### Security Considerations

- **Public Keys Only**: The `VITE_SUPABASE_ANON_KEY` is safe to expose in client-side code
- **Never Expose Service Role Key**: Never add your Supabase service role key as a `VITE_` variable
- **Row Level Security**: Make sure your Supabase RLS policies are properly configured to protect your data

### Environment-Specific Variables

You can set different values for different environments:

- **Production**: Your production Supabase project
- **Preview**: A staging/test Supabase project (optional)
- **Development**: Your local development Supabase project (optional)

## Troubleshooting

### Environment Variables Not Working

1. **Check Variable Names**: Ensure they start with `VITE_`
2. **Redeploy**: Environment variables are only available after a new deployment
3. **Check Environment**: Make sure variables are set for the correct environment (Production/Preview/Development)
4. **Check Console**: Look for errors in the browser console

### Still Seeing "Supabase URL and/or Anon Key are not set"

1. Verify variables are set in Vercel dashboard
2. Ensure variable names match exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Redeploy your application
4. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Different Values for Different Environments

If you want different Supabase projects for production and preview:

1. In Vercel dashboard, when adding variables:
   - Uncheck "Production" and only check "Preview" for preview-specific values
   - Uncheck "Preview" and only check "Production" for production-specific values

## Example Configuration

Here's what your Vercel environment variables should look like:

```
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODc2MjQwMCwiZXhwIjoyMDE0MzM4NDAwfQ.example_key_here
```

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase API Documentation](https://supabase.com/docs/reference/javascript/initializing)

