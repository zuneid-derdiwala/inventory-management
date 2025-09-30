# Inventory Management App

A modern inventory management application built with React, TypeScript, and Supabase.

## Features

- **User Authentication**: Secure login/signup with Supabase Auth
- **User-specific Data**: Each user can only see and manage their own inventory data
- **Inventory Management**: Add, edit, delete, and search inventory entries
- **Data Export/Import**: Export data to Excel and import from Excel files
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

Run the following SQL scripts in your Supabase SQL editor in this order:

1. `supabase_create_auth_tables.sql` - Creates the profiles table and adds user_id columns
2. `supabase_trigger_on_auth_user_created.sql` - Creates trigger for new user profiles
3. `supabase_rls_policies_only.sql` - Sets up Row Level Security policies

### 3. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 4. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

## Authentication Flow

1. **Sign Up**: Users can create accounts with email, password, and username
2. **Sign In**: Users log in with email and password
3. **Data Isolation**: Each user only sees their own data due to Row Level Security
4. **Sign Out**: Users can sign out from the navbar dropdown

## Database Schema

The app uses the following main tables:
- `entries` - Main inventory entries with IMEI, brand, model, etc.
- `brands` - Available brands (user-specific)
- `models` - Available models per brand (user-specific)
- `sellers` - Available sellers (user-specific)
- `booking_persons` - Available booking persons (user-specific)
- `profiles` - User profile information

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui with Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: React Context API
- **Routing**: React Router
- **Icons**: Lucide React
