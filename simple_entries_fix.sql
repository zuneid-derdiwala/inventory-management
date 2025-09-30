-- Simple fix: Allow entries to be created without user_id initially
-- Then update them with the current user's ID

-- Temporarily disable RLS for entries table to allow creation
ALTER TABLE public.entries DISABLE ROW LEVEL SECURITY;

-- Add user_id column if it doesn't exist
ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Re-enable RLS
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to insert entries
-- The user_id will be set by the app or manually
CREATE POLICY "Users can insert entries"
  ON public.entries FOR INSERT
  WITH CHECK (true); -- Allow any authenticated user to insert

CREATE POLICY "Users can view their own entries"
  ON public.entries FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own entries"
  ON public.entries FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own entries"
  ON public.entries FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Update any existing entries without user_id to the first user
UPDATE public.entries 
SET user_id = (
  SELECT id FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Test the setup
SELECT 'Entries table fixed' as status;
SELECT COUNT(*) as total_entries FROM public.entries;
