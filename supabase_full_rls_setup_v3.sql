-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies to ensure a clean slate
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.entries;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.brands;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.models;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.sellers;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.booking_persons;
DROP POLICY IF EXISTS "Allow all for users with matching id" ON public.profiles;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.set_username(new_username text);
DROP FUNCTION IF EXISTS public.resolve_email_from_identifier(identifier text);
DROP FUNCTION IF EXISTS public.assign_null_data_to_first_app_user();

-- Ensure 'user_id' column exists and is correctly configured in data tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'entries' AND column_name = 'user_id') THEN
        ALTER TABLE public.entries ADD COLUMN user_id uuid;
    END IF;
    ALTER TABLE public.entries ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.entries ALTER COLUMN user_id SET DEFAULT auth.uid();

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'user_id') THEN
        ALTER TABLE public.brands ADD COLUMN user_id uuid;
    END IF;
    ALTER TABLE public.brands ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.brands ALTER COLUMN user_id SET DEFAULT auth.uid();

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'models' AND column_name = 'user_id') THEN
        ALTER TABLE public.models ADD COLUMN user_id uuid;
    END IF;
    ALTER TABLE public.models ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.models ALTER COLUMN user_id SET DEFAULT auth.uid();

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sellers' AND column_name = 'user_id') THEN
        ALTER TABLE public.sellers ADD COLUMN user_id uuid;
    END IF;
    ALTER TABLE public.sellers ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.sellers ALTER COLUMN user_id SET DEFAULT auth.uid();

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_persons' AND column_name = 'user_id') THEN
        ALTER TABLE public.booking_persons ADD COLUMN user_id uuid;
    END IF;
    ALTER TABLE public.booking_persons ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.booking_persons ALTER COLUMN user_id SET DEFAULT auth.uid();
END
$$;

-- Ensure 'profiles' table has 'id', 'username', 'email' columns and correct defaults
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id') THEN
        ALTER TABLE public.profiles ADD COLUMN id uuid;
    END IF;
    ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT auth.uid();
    
    -- Add foreign key constraint only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username text;
    END IF;
    ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
    -- Add unique constraint only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_unique' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT username_unique UNIQUE (username);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
    ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
    -- Add unique constraint only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_unique' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT email_unique UNIQUE (email);
    END IF;
END
$$;

-- Create RLS policies for 'entries' table
CREATE POLICY "Allow all for users with matching user_id" ON public.entries
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for 'brands' table
CREATE POLICY "Allow all for users with matching user_id" ON public.brands
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for 'models' table
CREATE POLICY "Allow all for users with matching user_id" ON public.models
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for 'sellers' table
CREATE POLICY "Allow all for users with matching user_id" ON public.sellers
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for 'booking_persons' table
CREATE POLICY "Allow all for users with matching user_id" ON public.booking_persons
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for 'profiles' table
CREATE POLICY "Allow all for users with matching id" ON public.profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create or replace the set_username function
CREATE OR REPLACE FUNCTION public.set_username(new_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET username = new_username
  WHERE id = auth.uid();
END;
$$;

-- Grant execute on set_username to authenticated users
GRANT EXECUTE ON FUNCTION public.set_username(text) TO authenticated;

-- Create or replace the resolve_email_from_identifier function
CREATE OR REPLACE FUNCTION public.resolve_email_from_identifier(identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resolved_email text;
BEGIN
  -- Try to find by email first
  SELECT email INTO resolved_email FROM auth.users WHERE email = identifier;

  IF resolved_email IS NULL THEN
    -- If not found by email, try to find by username in profiles table
    SELECT p.email INTO resolved_email
    FROM public.profiles p
    WHERE p.username = identifier;
  END IF;

  RETURN resolved_email;
END;
$$;

-- Grant execute on resolve_email_from_identifier to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.resolve_email_from_identifier(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_email_from_identifier(text) TO anon;

-- Create or replace the assign_null_data_to_first_app_user function
CREATE OR REPLACE FUNCTION public.assign_null_data_to_first_app_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_user_id uuid;
BEGIN
    -- Get the ID of the first user who registered in the app
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

    IF first_user_id IS NOT NULL THEN
        -- Update entries table
        UPDATE public.entries
        SET user_id = first_user_id
        WHERE user_id IS NULL;

        -- Update brands table
        UPDATE public.brands
        SET user_id = first_user_id
        WHERE user_id IS NULL;

        -- Update models table
        UPDATE public.models
        SET user_id = first_user_id
        WHERE user_id IS NULL;

        -- Update sellers table
        UPDATE public.sellers
        SET user_id = first_user_id
        WHERE user_id IS NULL;

        -- Update booking_persons table
        UPDATE public.booking_persons
        SET user_id = first_user_id
        WHERE user_id IS NULL;
    END IF;
END;
$$;

-- Grant execute on assign_null_data_to_first_app_user to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_null_data_to_first_app_user() TO authenticated;