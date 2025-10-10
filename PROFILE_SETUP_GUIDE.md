# Profile Settings Setup Guide

This guide will help you set up the profile settings functionality with username and avatar upload.

## Issues Fixed

The profile settings were failing due to two missing components:
1. **Missing `avatar_url` column** in the `profiles` table
2. **Missing `avatars` storage bucket** in Supabase Storage

## Setup Steps

### 1. Add Avatar URL Column to Database

Run the following SQL script in your Supabase SQL Editor:

```sql
-- File: supabase_add_avatar_url.sql
-- Add avatar_url column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
        RAISE NOTICE 'Added avatar_url column to profiles table';
    ELSE
        RAISE NOTICE 'avatar_url column already exists in profiles table';
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
```

### 2. Create Storage Bucket for Avatars

Run the following SQL script in your Supabase SQL Editor:

```sql
-- File: supabase_setup_storage.sql
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
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
```

### 3. Alternative: Manual Setup in Supabase Dashboard

If you prefer to set up manually:

#### Database Setup:
1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **profiles** table
3. Click **Add Column**
4. Set:
   - **Name**: `avatar_url`
   - **Type**: `text`
   - **Default**: Leave empty
   - **Allow nullable**: Yes

#### Storage Setup:
1. Go to **Storage** in your Supabase dashboard
2. Click **Create Bucket**
3. Set:
   - **Name**: `avatars`
   - **Public**: Yes
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

## Features After Setup

Once the setup is complete, users will be able to:

### ✅ **Username Management:**
- Update their username with validation
- Check for duplicate usernames
- See username in welcome messages

### ✅ **Avatar Upload:**
- Upload profile pictures (JPEG, PNG, GIF, WebP)
- 5MB file size limit
- Automatic image preview
- Fallback to initials if no avatar

### ✅ **Profile Display:**
- Personalized welcome messages
- Avatar display throughout the app
- Real-time updates after changes

## Troubleshooting

### If you still see errors:

1. **Check the database schema:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles';
   ```

2. **Check storage buckets:**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'avatars';
   ```

3. **Verify RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects';
   ```

### Common Issues:

- **"column profiles.avatar_url does not exist"** → Run the database setup script
- **"Bucket not found"** → Run the storage setup script
- **Permission denied** → Check RLS policies are correctly set

## Testing

After setup, test the functionality:

1. Go to **Profile Settings** from the homepage
2. Try updating your username
3. Try uploading an avatar image
4. Check that changes are reflected in the welcome message

The profile settings should now work without errors!
