-- Drop policies first to avoid dependency issues
DROP POLICY IF EXISTS "Users can view their own entries." ON public.entries;
DROP POLICY IF EXISTS "Users can insert their own entries." ON public.entries;
DROP POLICY IF EXISTS "Users can update their own entries." ON public.entries;
DROP POLICY IF EXISTS "Users can delete their own entries." ON public.entries;

DROP POLICY IF EXISTS "Users can view their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can insert their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands." ON public.brands;

DROP POLICY IF EXISTS "Users can view their own models." ON public.models;
DROP POLICY IF EXISTS "Users can insert their own models." ON public.models;
DROP POLICY IF EXISTS "Users can update their own models." ON public.models;
DROP POLICY IF EXISTS "Users can delete their own models." ON public.models;

DROP POLICY IF EXISTS "Users can view their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can insert their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can update their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can delete their own sellers." ON public.sellers;

DROP POLICY IF EXISTS "Users can view their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can insert their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can update their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can delete their own booking persons." ON public.booking_persons;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Drop the trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop tables in reverse order of dependency
DROP TABLE IF EXISTS public.entries CASCADE;
DROP TABLE IF EXISTS public.models CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.sellers CASCADE;
DROP TABLE IF EXISTS public.booking_persons CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;