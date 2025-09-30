-- Assign existing entries with NULL user_id to the current authenticated user
UPDATE entries
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Assign existing brands with NULL user_id to the current authenticated user
UPDATE brands
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Assign existing models with NULL user_id to the current authenticated user
UPDATE models
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Assign existing sellers with NULL user_id to the current authenticated user
UPDATE sellers
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Assign existing booking_persons with NULL user_id to the current authenticated user
UPDATE booking_persons
SET user_id = auth.uid()
WHERE user_id IS NULL;