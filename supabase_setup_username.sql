-- Create a function to set a username for a profile
CREATE OR REPLACE FUNCTION public.set_username(new_username text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET username = new_username
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;