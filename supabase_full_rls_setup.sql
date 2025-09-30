-- Add user_id column to tables if it doesn't exist and set up foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'user_id') THEN
        ALTER TABLE public.entries ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS entries_user_id_idx ON public.entries (user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'user_id') THEN
        ALTER TABLE public.brands ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS brands_user_id_idx ON public.brands (user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'user_id') THEN
        ALTER TABLE public.models ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS models_user_id_idx ON public.models (user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'user_id') THEN
        ALTER TABLE public.sellers ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS sellers_user_id_idx ON public.sellers (user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_persons' AND column_name = 'user_id') THEN
        ALTER TABLE public.booking_persons ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS booking_persons_user_id_idx ON public.booking_persons (user_id);
    END IF;
END
$$;

-- Enable RLS for all relevant tables
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.entries;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.brands;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.models;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.sellers;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.booking_persons;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Policies for 'entries' table
CREATE POLICY "Allow all for users with matching user_id"
ON public.entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for 'brands' table
CREATE POLICY "Allow all for users with matching user_id"
ON public.brands
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for 'models' table
CREATE POLICY "Allow all for users with matching user_id"
ON public.models
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for 'sellers' table
CREATE POLICY "Allow all for users with matching user_id"
ON public.sellers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for 'booking_persons' table
CREATE POLICY "Allow all for users with matching user_id"
ON public.booking_persons
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for 'profiles' table
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to assign existing data without user_id to the first registered user
-- This function should be run ONCE by the user who should "own" the initial data.
CREATE OR REPLACE FUNCTION public.assign_null_data_to_first_app_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_user_uuid uuid;
BEGIN
    -- Get the UUID of the currently authenticated user
    first_user_uuid := auth.uid();

    IF first_user_uuid IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found. Please log in to the app and then run this function.';
    END IF;

    -- Update entries table
    UPDATE public.entries
    SET user_id = first_user_uuid
    WHERE user_id IS NULL;

    -- Update brands table
    UPDATE public.brands
    SET user_id = first_user_uuid
    WHERE user_id IS NULL;

    -- Update models table
    UPDATE public.models
    SET user_id = first_user_uuid
    WHERE user_id IS NULL;

    -- Update sellers table
    UPDATE public.sellers
    SET user_id = first_user_uuid
    WHERE user_id IS NULL;

    -- Update booking_persons table
    UPDATE public.booking_persons
    SET user_id = first_user_uuid
    WHERE user_id IS NULL;

    RAISE NOTICE 'All unassigned data has been assigned to user_id: %', first_user_uuid;
END;
$$;