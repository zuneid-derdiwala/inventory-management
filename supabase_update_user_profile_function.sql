-- Create RPC function to update user profile (role and avatar_url) (admin only)
-- This function allows admins to update user profiles, bypassing RLS

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text);

-- Create the function
CREATE OR REPLACE FUNCTION public.update_user_profile(
  target_user_id uuid,
  new_avatar_url text,
  new_role text
)
RETURNS void
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

  -- Only allow admins to update user profiles
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Update the user's profile
  UPDATE public.profiles
  SET 
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    role = COALESCE(new_role, role)
  WHERE id = target_user_id;

  -- Check if any rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found with id: %', target_user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated role only
GRANT EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_user_profile(uuid, text, text) IS 'Updates user profile (avatar_url and role). Admin only. Bypasses RLS using SECURITY DEFINER.';

