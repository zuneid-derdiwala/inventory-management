-- Add mobile column to profiles table
-- This script adds the mobile phone number column to the profiles table
-- Mobile numbers should be stored in E.164 format (e.g., +1234567890) to support international numbers

-- Add mobile column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'mobile'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN mobile text;
        RAISE NOTICE 'Added mobile column to profiles table';
    ELSE
        RAISE NOTICE 'mobile column already exists in profiles table';
    END IF;
END $$;

-- Add country_code column if it doesn't exist (optional, for easier filtering/grouping)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'country_code'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN country_code text;
        RAISE NOTICE 'Added country_code column to profiles table';
    ELSE
        RAISE NOTICE 'country_code column already exists in profiles table';
    END IF;
END $$;

-- Grant necessary permissions (if not already granted)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

