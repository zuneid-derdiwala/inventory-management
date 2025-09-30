-- Fix entries table RLS to automatically assign user_id
-- This allows users to create entries without manually setting user_id

-- First, let's check the current entries table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'entries' 
ORDER BY ordinal_position;

-- Add user_id column if it doesn't exist
ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create a trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.handle_new_entry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_entry_created ON public.entries;

-- Create the trigger
CREATE TRIGGER on_entry_created
  BEFORE INSERT ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_entry();

-- Update existing entries that don't have user_id
-- Assign them to the first user (or you can specify a user_id)
UPDATE public.entries 
SET user_id = (
  SELECT id FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Test the fix by checking entries
SELECT COUNT(*) as total_entries, 
       COUNT(*) FILTER (WHERE user_id IS NOT NULL) as entries_with_user_id
FROM public.entries;
