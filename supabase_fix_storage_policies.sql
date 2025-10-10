-- Fix storage policies for avatar uploads
-- This script removes the restrictive policies and creates simpler ones

-- Drop ALL existing policies for storage.objects to avoid conflicts
DO $$ 
DECLARE
    policy_name text;
BEGIN
    -- Get all policy names for storage.objects
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Create new, simpler policies
CREATE POLICY "Authenticated users can upload to avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
