-- Alternative: Disable RLS on storage.objects temporarily
-- This is a simpler approach if the policy script doesn't work

-- Disable RLS on storage.objects (less secure but works)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS after a few seconds (you can do this manually)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
