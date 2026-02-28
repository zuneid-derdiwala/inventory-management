-- Add password_changed_at column to profiles table
-- This column tracks when the user last changed their password
-- Used to enforce 30-day password rotation policy

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone DEFAULT now();

-- Set password_changed_at to now() for all existing users who don't have it set
-- This gives existing users a fresh 30-day window from when this migration runs
UPDATE public.profiles
SET password_changed_at = now()
WHERE password_changed_at IS NULL;
