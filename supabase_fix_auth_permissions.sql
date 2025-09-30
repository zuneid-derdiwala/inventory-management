-- Set search path for public schema to include auth
ALTER ROLE postgres SET search_path = public, auth;
ALTER ROLE authenticator SET search_path = public, auth;
ALTER DATABASE postgres SET search_path = public, auth;

-- Grant execute on auth.email_sign_in to anon role
GRANT EXECUTE ON FUNCTION auth.email_sign_in(text, text) TO anon;