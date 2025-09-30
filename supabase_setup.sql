-- Create the 'entries' table
CREATE TABLE IF NOT EXISTS public.entries (
    imei text PRIMARY KEY,
    brand text,
    model text,
    seller text,
    booking_person text,
    inward_date timestamp with time zone,
    inward_amount numeric,
    buyer text,
    outward_date timestamp with time zone,
    outward_amount numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries." ON public.entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries." ON public.entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries." ON public.entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries." ON public.entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create the 'brands' table
CREATE TABLE IF NOT EXISTS public.brands (
    name text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brands." ON public.brands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brands." ON public.brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brands." ON public.brands
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brands." ON public.brands
  FOR DELETE USING (auth.uid() = user_id);

-- Create the 'models' table
CREATE TABLE IF NOT EXISTS public.models (
    brand_name text NOT NULL REFERENCES public.brands(name) ON DELETE CASCADE,
    name text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (brand_name, name)
);

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own models." ON public.models
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own models." ON public.models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models." ON public.models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models." ON public.models
  FOR DELETE USING (auth.uid() = user_id);

-- Create the 'sellers' table
CREATE TABLE IF NOT EXISTS public.sellers (
    name text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sellers." ON public.sellers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sellers." ON public.sellers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sellers." ON public.sellers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sellers." ON public.sellers
  FOR DELETE USING (auth.uid() = user_id);

-- Create the 'booking_persons' table
CREATE TABLE IF NOT EXISTS public.booking_persons (
    name text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.booking_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own booking persons." ON public.booking_persons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking persons." ON public.booking_persons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking persons." ON public.booking_persons
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking persons." ON public.booking_persons
  FOR DELETE USING (auth.uid() = user_id);