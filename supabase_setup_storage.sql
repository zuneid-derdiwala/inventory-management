-- Setup Supabase Storage for avatars
-- This script creates the avatars bucket and sets up proper policies

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Create policy to allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

-- Create policy to allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

-- Create policy to allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
