-- Remove user-specific RLS policies and make data visible to all users

-- Drop existing user-specific policies for entries
DROP POLICY IF EXISTS "Users can view their own entries." ON entries;
DROP POLICY IF EXISTS "Users can insert their own entries." ON entries;
DROP POLICY IF EXISTS "Users can update their own entries." ON entries;
DROP POLICY IF EXISTS "Users can delete their own entries." ON entries;

-- Create public access policies for entries
CREATE POLICY "Anyone can view entries" ON entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert entries" ON entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update entries" ON entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete entries" ON entries FOR DELETE USING (true);

-- Drop existing user-specific policies for brands
DROP POLICY IF EXISTS "Users can view their own brands." ON brands;
DROP POLICY IF EXISTS "Users can insert their own brands." ON brands;
DROP POLICY IF EXISTS "Users can update their own brands." ON brands;
DROP POLICY IF EXISTS "Users can delete their own brands." ON brands;

-- Create public access policies for brands
CREATE POLICY "Anyone can view brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Anyone can insert brands" ON brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update brands" ON brands FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete brands" ON brands FOR DELETE USING (true);

-- Drop existing user-specific policies for models
DROP POLICY IF EXISTS "Users can view their own models." ON models;
DROP POLICY IF EXISTS "Users can insert their own models." ON models;
DROP POLICY IF EXISTS "Users can update their own models." ON models;
DROP POLICY IF EXISTS "Users can delete their own models." ON models;

-- Create public access policies for models
CREATE POLICY "Anyone can view models" ON models FOR SELECT USING (true);
CREATE POLICY "Anyone can insert models" ON models FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update models" ON models FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete models" ON models FOR DELETE USING (true);

-- Drop existing user-specific policies for sellers
DROP POLICY IF EXISTS "Users can view their own sellers." ON sellers;
DROP POLICY IF EXISTS "Users can insert their own sellers." ON sellers;
DROP POLICY IF EXISTS "Users can update their own sellers." ON sellers;
DROP POLICY IF EXISTS "Users can delete their own sellers." ON sellers;

-- Create public access policies for sellers
CREATE POLICY "Anyone can view sellers" ON sellers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sellers" ON sellers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sellers" ON sellers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sellers" ON sellers FOR DELETE USING (true);

-- Drop existing user-specific policies for booking_persons
DROP POLICY IF EXISTS "Users can view their own booking persons." ON booking_persons;
DROP POLICY IF EXISTS "Users can insert their own booking persons." ON booking_persons;
DROP POLICY IF EXISTS "Users can update their own booking persons." ON booking_persons;
DROP POLICY IF EXISTS "Users can delete their own booking persons." ON booking_persons;

-- Create public access policies for booking_persons
CREATE POLICY "Anyone can view booking_persons" ON booking_persons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert booking_persons" ON booking_persons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update booking_persons" ON booking_persons FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete booking_persons" ON booking_persons FOR DELETE USING (true);
