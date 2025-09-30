-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.login_with_username_or_email(text, text);

-- Create a new function to resolve email from identifier (username or email)
CREATE OR REPLACE FUNCTION public.resolve_email_from_identifier(identifier text)
RETURNS text AS $$
DECLARE
    user_email text;
BEGIN
    -- Check if the identifier is already an email format
    IF identifier LIKE '%@%' THEN
        RETURN identifier;
    END IF;

    -- Try to find by username in the profiles table
    SELECT email INTO user_email FROM public.profiles WHERE username = identifier;

    IF user_email IS NOT NULL THEN
        RETURN user_email;
    ELSE
        -- If not found by username and not an email, raise an exception
        RAISE EXCEPTION 'Invalid identifier: Username or email not found.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to the anon role
GRANT EXECUTE ON FUNCTION public.resolve_email_from_identifier(text) TO anon;