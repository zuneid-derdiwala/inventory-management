-- Enable RLS on all relevant tables
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_persons ENABLE ROW LEVEL SECURITY;

-- Policies for 'profiles' table
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile." ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Policies for 'entries' table
CREATE POLICY "Users can view their own entries." ON public.entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own entries." ON public.entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own entries." ON public.entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own entries." ON public.entries FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'brands' table
CREATE POLICY "Users can view their own brands." ON public.brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own brands." ON public.brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own brands." ON public.brands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own brands." ON public.brands FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'models' table
CREATE POLICY "Users can view their own models." ON public.models FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own models." ON public.models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own models." ON public.models FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own models." ON public.models FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'sellers' table
CREATE POLICY "Users can view their own sellers." ON public.sellers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sellers." ON public.sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sellers." ON public.sellers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sellers." ON public.sellers FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'booking_persons' table
CREATE POLICY "Users can view their own booking persons." ON public.booking_persons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own booking persons." ON public.booking_persons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own booking persons." ON public.booking_persons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own booking persons." ON public.booking_persons FOR DELETE USING (auth.uid() = user_id);