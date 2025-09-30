-- Enable RLS for all relevant tables if not already enabled
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_persons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (if any were created manually)

-- Policies for 'entries' table
DROP POLICY IF EXISTS "Enable read access for all authenticated users on entries" ON public.entries;
DROP POLICY IF EXISTS "Enable insert for authenticated users on entries" ON public.entries;
DROP POLICY IF EXISTS "Enable update for authenticated users on entries" ON public.entries;
DROP POLICY IF EXISTS "Enable delete for authenticated users on entries" ON public.entries;

CREATE POLICY "Enable read access for all authenticated users on entries" ON public.entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on entries" ON public.entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on entries" ON public.entries
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on entries" ON public.entries
  FOR DELETE USING (auth.role() = 'authenticated');


-- Policies for 'brands' table
DROP POLICY IF EXISTS "Enable read access for all authenticated users on brands" ON public.brands;
DROP POLICY IF EXISTS "Enable insert for authenticated users on brands" ON public.brands;
DROP POLICY IF EXISTS "Enable update for authenticated users on brands" ON public.brands;
DROP POLICY IF EXISTS "Enable delete for authenticated users on brands" ON public.brands;

CREATE POLICY "Enable read access for all authenticated users on brands" ON public.brands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on brands" ON public.brands
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on brands" ON public.brands
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on brands" ON public.brands
  FOR DELETE USING (auth.role() = 'authenticated');


-- Policies for 'models' table
DROP POLICY IF EXISTS "Enable read access for all authenticated users on models" ON public.models;
DROP POLICY IF EXISTS "Enable insert for authenticated users on models" ON public.models;
DROP POLICY IF EXISTS "Enable update for authenticated users on models" ON public.models;
DROP POLICY IF EXISTS "Enable delete for authenticated users on models" ON public.models;

CREATE POLICY "Enable read access for all authenticated users on models" ON public.models
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on models" ON public.models
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on models" ON public.models
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on models" ON public.models
  FOR DELETE USING (auth.role() = 'authenticated');


-- Policies for 'sellers' table
DROP POLICY IF EXISTS "Enable read access for all authenticated users on sellers" ON public.sellers;
DROP POLICY IF EXISTS "Enable insert for authenticated users on sellers" ON public.sellers;
DROP POLICY IF EXISTS "Enable update for authenticated users on sellers" ON public.sellers;
DROP POLICY IF EXISTS "Enable delete for authenticated users on sellers" ON public.sellers;

CREATE POLICY "Enable read access for all authenticated users on sellers" ON public.sellers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on sellers" ON public.sellers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on sellers" ON public.sellers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on sellers" ON public.sellers
  FOR DELETE USING (auth.role() = 'authenticated');


-- Policies for 'booking_persons' table
DROP POLICY IF EXISTS "Enable read access for all authenticated users on booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Enable insert for authenticated users on booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Enable update for authenticated users on booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Enable delete for authenticated users on booking_persons" ON public.booking_persons;

CREATE POLICY "Enable read access for all authenticated users on booking_persons" ON public.booking_persons
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on booking_persons" ON public.booking_persons
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on booking_persons" ON public.booking_persons
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on booking_persons" ON public.booking_persons
  FOR DELETE USING (auth.role() = 'authenticated');