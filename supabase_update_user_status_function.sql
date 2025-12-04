-- Create RPC function to update user is_active status (admin only)
-- This function allows admins to activate/deactivate users, bypassing RLS

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_user_status(uuid, boolean);

-- Create the function
CREATE OR REPLACE FUNCTION public.update_user_status(
  target_user_id uuid,
  new_status boolean
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

  -- Only allow admins to update user status
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Update the user's is_active status
  UPDATE public.profiles
  SET is_active = new_status
  WHERE id = target_user_id;

  -- Check if any rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found with id: %', target_user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated role only
GRANT EXECUTE ON FUNCTION public.update_user_status(uuid, boolean) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_user_status(uuid, boolean) IS 'Updates user is_active status. Admin only. Bypasses RLS using SECURITY DEFINER.';

