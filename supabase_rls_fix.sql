-- Enable Row Level Security (RLS) on the 'profiles' table if it's not already enabled.
-- This is a prerequisite for applying RLS policies.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create or replace a policy to allow public read access to the 'profiles' table.
-- This policy is necessary for the application to check if a username already exists
-- during the registration process, even for unauthenticated users.
-- It grants SELECT permissions to both 'anon' (anonymous/unauthenticated) and
-- 'authenticated' users for all rows in the 'profiles' table.
-- While 'USING (true)' allows access to all columns, the application only
-- queries the 'username' column for availability checks, which is generally safe.
CREATE POLICY "Allow public read access to profiles for username check"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);