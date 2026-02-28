-- Password history: prevent users from reusing their last password
-- Stores a hash of the current password when they change it; the next change is rejected if the new password hashes to the same value.

-- Table: one row per user with the hash of their most recent password (after each change we replace it)
CREATE TABLE IF NOT EXISTS public.user_password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id)
);

-- RLS: users can only read/insert/delete their own row (for the RPCs we use SECURITY DEFINER, but RLS still applies to direct access)
ALTER TABLE public.user_password_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own password history" ON public.user_password_history;
CREATE POLICY "Users can read own password history"
  ON public.user_password_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own password history" ON public.user_password_history;
CREATE POLICY "Users can insert own password history"
  ON public.user_password_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own password history" ON public.user_password_history;
CREATE POLICY "Users can update own password history"
  ON public.user_password_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own password history" ON public.user_password_history;
CREATE POLICY "Users can delete own password history"
  ON public.user_password_history FOR DELETE
  USING (auth.uid() = user_id);

-- Check if the given password hash is in the user's history (reuse check)
DROP FUNCTION IF EXISTS public.check_password_in_history(TEXT);
CREATE OR REPLACE FUNCTION public.check_password_in_history(p_password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_password_history
    WHERE user_id = auth.uid() AND password_hash = p_password_hash
  );
END;
$$;

-- Add the given password hash to the user's history and keep only the most recent (one row per user)
DROP FUNCTION IF EXISTS public.add_password_to_history(TEXT);
CREATE OR REPLACE FUNCTION public.add_password_to_history(p_password_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_password_history (user_id, password_hash)
  VALUES (auth.uid(), p_password_hash)
  ON CONFLICT (user_id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    created_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_password_in_history(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_password_to_history(TEXT) TO authenticated;

COMMENT ON TABLE public.user_password_history IS 'Stores hash of the user''s last password to prevent reuse on next change.';
COMMENT ON FUNCTION public.check_password_in_history(TEXT) IS 'Returns true if the given password hash matches the user''s stored (last) password.';
COMMENT ON FUNCTION public.add_password_to_history(TEXT) IS 'Stores the given password hash as the user''s last password (one row per user).';
