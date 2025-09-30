-- Enable Row Level Security for entries table
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (read) access on entries
CREATE POLICY "Users can view their own entries."
ON entries FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT (create) access on entries
CREATE POLICY "Users can insert their own entries."
ON entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (modify) access on entries
CREATE POLICY "Users can update their own entries."
ON entries FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE (remove) access on entries
CREATE POLICY "Users can delete their own entries."
ON entries FOR DELETE
USING (auth.uid() = user_id);


-- Enable Row Level Security for brands table
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (read) access on brands
CREATE POLICY "Users can view their own brands."
ON brands FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT (create) access on brands
CREATE POLICY "Users can insert their own brands."
ON brands FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (modify) access on brands
CREATE POLICY "Users can update their own brands."
ON brands FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE (remove) access on brands
CREATE POLICY "Users can delete their own brands."
ON brands FOR DELETE
USING (auth.uid() = user_id);


-- Enable Row Level Security for models table
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (read) access on models
CREATE POLICY "Users can view their own models."
ON models FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT (create) access on models
CREATE POLICY "Users can insert their own models."
ON models FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (modify) access on models
CREATE POLICY "Users can update their own models."
ON models FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE (remove) access on models
CREATE POLICY "Users can delete their own models."
ON models FOR DELETE
USING (auth.uid() = user_id);


-- Enable Row Level Security for sellers table
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (read) access on sellers
CREATE POLICY "Users can view their own sellers."
ON sellers FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT (create) access on sellers
CREATE POLICY "Users can insert their own sellers."
ON sellers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (modify) access on sellers
CREATE POLICY "Users can update their own sellers."
ON sellers FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE (remove) access on sellers
CREATE POLICY "Users can delete their own sellers."
ON sellers FOR DELETE
USING (auth.uid() = user_id);


-- Enable Row Level Security for booking_persons table
ALTER TABLE booking_persons ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (read) access on booking_persons
CREATE POLICY "Users can view their own booking persons."
ON booking_persons FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT (create) access on booking_persons
CREATE POLICY "Users can insert their own booking persons."
ON booking_persons FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (modify) access on booking_persons
CREATE POLICY "Users can update their own booking persons."
ON booking_persons FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE (remove) access on booking_persons
CREATE POLICY "Users can delete their own booking persons."
ON booking_persons FOR DELETE
USING (auth.uid() = user_id);