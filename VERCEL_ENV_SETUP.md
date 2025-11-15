# Vercel Environment Variables Setup

This guide explains how to configure environment variables in Vercel for your inventory management application.

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

### Vite Environment Variables

- **Prefix Required**: All environment variables used in Vite must be prefixed with `VITE_`
- **Public Variables**: Variables prefixed with `VITE_` are exposed to the client-side code
- **Build Time**: Environment variables are injected at build time, not runtime

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

