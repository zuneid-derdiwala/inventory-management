-- Add is_active column to profiles table for soft delete functionality
-- This allows deactivating users without deleting their data

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active boolean DEFAULT true NOT NULL;
        RAISE NOTICE 'Added is_active column to profiles table';
    ELSE
        RAISE NOTICE 'is_active column already exists in profiles table';
    END IF;
END $$;

-- Update existing users to be active by default (if column was just added)
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_active IS 'Indicates if the user account is active. Inactive users cannot log in but their data is preserved.';

