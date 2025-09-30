-- Enable Row Level Security (RLS) on the 'sellers' table if it's not already enabled.
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Create or replace a policy to allow authenticated users to perform all operations
-- (SELECT, INSERT, UPDATE, DELETE) on the 'sellers' table.
CREATE POLICY "Allow authenticated users to manage sellers"
ON sellers FOR ALL
TO authenticated
USING (true) WITH CHECK (true);