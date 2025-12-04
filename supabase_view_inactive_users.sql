-- Query to view all inactive (deactivated) users
-- Run this in Supabase SQL Editor to see users who have been soft-deleted

SELECT 
  id,
  email,
  username,
  role,
  is_active,
  created_at,
  avatar_url
FROM public.profiles
WHERE is_active = false
ORDER BY created_at DESC;

-- To see both active and inactive users with their status:
-- SELECT 
--   id,
--   email,
--   username,
--   role,
--   is_active,
--   CASE 
--     WHEN is_active = false THEN 'Inactive (Deactivated)'
--     WHEN is_active = true THEN 'Active'
--     ELSE 'Unknown'
--   END as status,
--   created_at
-- FROM public.profiles
-- ORDER BY is_active DESC, created_at DESC;

