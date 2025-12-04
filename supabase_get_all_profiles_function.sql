-- Create RPC function to get all profiles (admin only)
-- This function allows admins to fetch all user profiles, bypassing RLS

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.get_all_profiles();

-- Create the function
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  avatar_url text,
  role text,
  created_at timestamptz,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if the current user is an admin
  SELECT profiles.role INTO current_user_role
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  -- Only allow admins to fetch all profiles
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Return all profiles
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.username,
    p.avatar_url,
    p.role,
    COALESCE(p.created_at, u.created_at) as created_at,
    COALESCE(p.is_active, true) as is_active
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY COALESCE(p.created_at, u.created_at) DESC;
END;
$$;

-- Grant execute permission to authenticated role only
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_all_profiles() IS 'Returns all user profiles. Admin only. Bypasses RLS using SECURITY DEFINER.';

