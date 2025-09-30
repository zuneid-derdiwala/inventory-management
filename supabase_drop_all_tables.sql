-- Disable Row Level Security temporarily to allow dropping tables
ALTER TABLE public.entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_persons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop tables
DROP TABLE IF EXISTS public.entries CASCADE;
DROP TABLE IF EXISTS public.models CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.sellers CASCADE;
DROP TABLE IF EXISTS public.booking_persons CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- Re-enable RLS (though tables are gone, good practice)
-- ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.booking_persons ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Note: This script does not drop the 'auth.users' table as it's managed by Supabase Auth.
-- It also does not drop any RLS policies directly, as they are tied to the tables.
-- Once tables are dropped, their associated RLS policies are also implicitly removed.