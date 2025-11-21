-- Setup Storage Policies for avatars bucket
-- Use this script if you've already created the 'avatars' bucket manually in Supabase Dashboard
-- This script only creates the policies and handles permission errors gracefully

-- Drop existing policies for avatars bucket to avoid conflicts
DO $$ 
BEGIN
    -- Try to drop existing policies (ignore errors if they don't exist or can't be dropped)
    BEGIN
        DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Create policy to allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Create policy to allow authenticated users to update avatars
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

-- Create policy to allow authenticated users to delete avatars
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

-- Create policy to allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

