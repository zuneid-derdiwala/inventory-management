-- Fix RLS policies to allow all users to see shared reference data
-- This makes brands, models, sellers, and booking_persons visible to all authenticated users
-- while keeping entries user-specific

-- Drop existing restrictive policies for reference data
DROP POLICY IF EXISTS "Users can view their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can view their own models." ON public.models;
DROP POLICY IF EXISTS "Users can view their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can view their own booking_persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.brands;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.models;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.sellers;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.booking_persons;

-- Create new policies that allow all authenticated users to read reference data
-- But only allow users to modify their own data

-- Brands: All users can read, but only modify their own
CREATE POLICY "All authenticated users can view brands"
  ON public.brands FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own brands"
  ON public.brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brands"
  ON public.brands FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brands"
  ON public.brands FOR DELETE
  USING (auth.uid() = user_id);

-- Models: All users can read, but only modify their own
CREATE POLICY "All authenticated users can view models"
  ON public.models FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own models"
  ON public.models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models"
  ON public.models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models"
  ON public.models FOR DELETE
  USING (auth.uid() = user_id);

-- Sellers: All users can read, but only modify their own
CREATE POLICY "All authenticated users can view sellers"
  ON public.sellers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own sellers"
  ON public.sellers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sellers"
  ON public.sellers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sellers"
  ON public.sellers FOR DELETE
  USING (auth.uid() = user_id);

-- Booking Persons: All users can read, but only modify their own
CREATE POLICY "All authenticated users can view booking_persons"
  ON public.booking_persons FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own booking_persons"
  ON public.booking_persons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking_persons"
  ON public.booking_persons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking_persons"
  ON public.booking_persons FOR DELETE
  USING (auth.uid() = user_id);

-- Keep entries user-specific (this is correct)
-- Entries should remain private to each user
-- No changes needed for entries policies

-- Test the new policies
SELECT 'Testing new policies...' as status;

-- Check if we can now see all brands
SELECT COUNT(*) as total_brands_visible FROM public.brands;

-- Check if we can now see all models  
SELECT COUNT(*) as total_models_visible FROM public.models;

-- Check if we can now see all sellers
SELECT COUNT(*) as total_sellers_visible FROM public.sellers;

-- Check if we can now see all booking_persons
SELECT COUNT(*) as total_booking_persons_visible FROM public.booking_persons;
