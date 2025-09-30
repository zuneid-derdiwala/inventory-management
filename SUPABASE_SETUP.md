# Supabase Setup Guide

## Issue: No Data Showing in Dropdowns

Your database has data (as shown in the Supabase dashboard), but the app is not connecting to it. This is because the Supabase environment variables are not configured.

## Solution: Configure Environment Variables

### Step 1: Create .env file

Create a `.env` file in your project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: Get Your Supabase Credentials

1. Go to your Supabase dashboard
2. Select your project
3. Go to Settings > API
4. Copy:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon/public key** → Use as `VITE_SUPABASE_ANON_KEY`

### Step 3: Example .env file

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODc2MjQwMCwiZXhwIjoyMDE0MzM4NDAwfQ.example_key_here
```

### Step 4: Restart Development Server

After creating the .env file:

```bash
npm run dev
# or
pnpm dev
```

### Step 5: Verify Connection

1. Open browser console (F12)
2. Look for messages like:
   - ✅ "Supabase configured successfully"
   - ✅ "Fetched brands from Supabase: [...]"
3. The dropdowns should now show your database data

## Troubleshooting

### If you still see "No data found":

1. Check browser console for error messages
2. Verify your .env file is in the project root
3. Make sure you restarted the development server
4. Check that your Supabase project has the correct tables and data

### If you see localStorage messages:

The app is falling back to localStorage because Supabase is not configured. Follow the steps above to connect to your database.

## Database Tables Required

Make sure your Supabase database has these tables:
- `brands` (with `name` column)
- `models` (with `brand_name` and `name` columns)  
- `sellers` (with `name` column)
- `booking_persons` (with `name` column)
- `entries` (main inventory table)

All tables should have Row Level Security (RLS) enabled for user-specific data access.
