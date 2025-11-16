-- Create RPC function to get email by username (bypasses RLS for login)
-- This function allows unauthenticated users to look up their email by username during login

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.get_email_by_username(text);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  -- Case-insensitive username lookup
  SELECT email INTO user_email
  FROM public.profiles
  WHERE LOWER(username) = LOWER(username_input)
  LIMIT 1;

  -- Return the email if found, otherwise return NULL
  RETURN user_email;
END;
$$;

-- Grant execute permission to anon role (for unauthenticated users during login)
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;

-- Grant execute permission to authenticated role (for authenticated users)
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_email_by_username(text) IS 'Returns the email address associated with a given username. Used for username-based login. Bypasses RLS using SECURITY DEFINER.';

