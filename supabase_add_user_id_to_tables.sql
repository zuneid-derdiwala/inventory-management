-- Add user_id column to entries table
ALTER TABLE entries
ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add user_id column to brands table
ALTER TABLE brands
ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add user_id column to models table
ALTER TABLE models
ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add user_id column to sellers table
ALTER TABLE sellers
ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add user_id column to booking_persons table
ALTER TABLE booking_persons
ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- IMPORTANT: If you have existing data, you might want to run an UPDATE statement
-- to assign a user_id to it, e.g., for a specific user or the current user.
-- For example, to assign all existing entries to a specific user (replace 'YOUR_USER_ID'):
-- UPDATE entries SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- Or, if you want to assign existing data to the user who runs this script (only works if run by an authenticated user):
-- UPDATE entries SET user_id = auth.uid() WHERE user_id IS NULL;
-- Repeat for other tables as needed.