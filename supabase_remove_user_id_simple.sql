-- Simple script to remove user_id column from brands, models, sellers, and booking_persons tables
-- These tables will be shared across all authenticated users

-- Step 1: Drop RLS policies that depend on user_id
DROP POLICY IF EXISTS "Users can view their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can insert their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands." ON public.brands;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.brands;
DROP POLICY IF EXISTS "All authenticated users can view brands" ON public.brands;
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;

DROP POLICY IF EXISTS "Users can view their own models." ON public.models;
DROP POLICY IF EXISTS "Users can insert their own models." ON public.models;
DROP POLICY IF EXISTS "Users can update their own models." ON public.models;
DROP POLICY IF EXISTS "Users can delete their own models." ON public.models;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.models;
DROP POLICY IF EXISTS "All authenticated users can view models" ON public.models;
DROP POLICY IF EXISTS "Users can insert their own models" ON public.models;
DROP POLICY IF EXISTS "Users can update their own models" ON public.models;
DROP POLICY IF EXISTS "Users can delete their own models" ON public.models;

DROP POLICY IF EXISTS "Users can view their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can insert their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can update their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can delete their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.sellers;
DROP POLICY IF EXISTS "All authenticated users can view sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users can insert their own sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users can update their own sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users can delete their own sellers" ON public.sellers;

DROP POLICY IF EXISTS "Users can view their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can insert their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can update their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can delete their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.booking_persons;
DROP POLICY IF EXISTS "All authenticated users can view booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Users can insert their own booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Users can update their own booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Users can delete their own booking_persons" ON public.booking_persons;

-- Step 2: Drop foreign key constraints on user_id
ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_user_id_fkey CASCADE;
ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_user_id_fkey CASCADE;
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey CASCADE;
ALTER TABLE public.booking_persons DROP CONSTRAINT IF EXISTS booking_persons_user_id_fkey CASCADE;

-- Step 3: Drop indexes on user_id
DROP INDEX IF EXISTS brands_user_id_idx;
DROP INDEX IF EXISTS models_user_id_idx;
DROP INDEX IF EXISTS sellers_user_id_idx;
DROP INDEX IF EXISTS booking_persons_user_id_idx;

-- Step 4: Remove user_id column from tables
ALTER TABLE public.brands DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.models DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.booking_persons DROP COLUMN IF EXISTS user_id;

-- Step 5: Create new RLS policies for shared access
CREATE POLICY "All authenticated users can access brands"
  ON public.brands
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can access models"
  ON public.models
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can access sellers"
  ON public.sellers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can access booking_persons"
  ON public.booking_persons
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

