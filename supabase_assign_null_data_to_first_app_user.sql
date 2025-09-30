-- This function will be called by a trigger to assign user_id to existing data
CREATE OR REPLACE FUNCTION assign_null_user_id_to_current_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for each table to assign user_id on update/insert if it's null
-- This ensures that if data is imported or updated without a user_id,
-- it gets assigned to the current authenticated user.

DROP TRIGGER IF EXISTS assign_entries_user_id ON entries;
CREATE TRIGGER assign_entries_user_id
BEFORE INSERT OR UPDATE ON entries
FOR EACH ROW EXECUTE FUNCTION assign_null_user_id_to_current_user();

DROP TRIGGER IF EXISTS assign_brands_user_id ON brands;
CREATE TRIGGER assign_brands_user_id
BEFORE INSERT OR UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION assign_null_user_id_to_current_user();

DROP TRIGGER IF EXISTS assign_models_user_id ON models;
CREATE TRIGGER assign_models_user_id
BEFORE INSERT OR UPDATE ON models
FOR EACH ROW EXECUTE FUNCTION assign_null_user_id_to_current_user();

DROP TRIGGER IF EXISTS assign_sellers_user_id ON sellers;
CREATE TRIGGER assign_sellers_user_id
BEFORE INSERT OR UPDATE ON sellers
FOR EACH ROW EXECUTE FUNCTION assign_null_user_id_to_current_user();

DROP TRIGGER IF EXISTS assign_booking_persons_user_id ON booking_persons;
CREATE TRIGGER assign_booking_persons_user_id
BEFORE INSERT OR UPDATE ON booking_persons
FOR EACH ROW EXECUTE FUNCTION assign_null_user_id_to_current_user();

-- Now, run an UPDATE statement to trigger these policies for existing NULL user_ids.
-- This will assign all currently NULL user_ids to the user who is currently logged into the app.
-- Make sure you are logged into your app with the user you want to own the existing data.
UPDATE entries SET user_id = user_id WHERE user_id IS NULL;
UPDATE brands SET user_id = user_id WHERE user_id IS NULL;
UPDATE models SET user_id = user_id WHERE user_id IS NULL;
UPDATE sellers SET user_id = user_id WHERE user_id IS NULL;
UPDATE booking_persons SET user_id = user_id WHERE user_id IS NULL;