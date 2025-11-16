-- Remove user_id column from brands, models, sellers, and booking_persons tables
-- These tables will now be shared across all users

-- Step 1: Drop existing RLS policies that depend on user_id for these tables
DROP POLICY IF EXISTS "Users can view their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can insert their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands." ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands." ON public.brands;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.brands;
DROP POLICY IF EXISTS "All authenticated users can view brands" ON public.brands;
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;

DROP POLICY IF EXISTS "Users can view their own models." ON public.models;
DROP POLICY IF EXISTS "Users can insert their own models." ON public.models;
DROP POLICY IF EXISTS "Users can update their own models." ON public.models;
DROP POLICY IF EXISTS "Users can delete their own models." ON public.models;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.models;
DROP POLICY IF EXISTS "All authenticated users can view models" ON public.models;
DROP POLICY IF EXISTS "Users can insert their own models" ON public.models;
DROP POLICY IF EXISTS "Users can update their own models" ON public.models;
DROP POLICY IF EXISTS "Users can delete their own models" ON public.models;

DROP POLICY IF EXISTS "Users can view their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can insert their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can update their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Users can delete their own sellers." ON public.sellers;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.sellers;
DROP POLICY IF EXISTS "All authenticated users can view sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users can insert their own sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users can update their own sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users can delete their own sellers" ON public.sellers;

DROP POLICY IF EXISTS "Users can view their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can insert their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can update their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Users can delete their own booking persons." ON public.booking_persons;
DROP POLICY IF EXISTS "Allow all for users with matching user_id" ON public.booking_persons;
DROP POLICY IF EXISTS "All authenticated users can view booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Users can insert their own booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Users can update their own booking_persons" ON public.booking_persons;
DROP POLICY IF EXISTS "Users can delete their own booking_persons" ON public.booking_persons;

-- Step 2: Drop foreign key constraints if they exist
DO $$
BEGIN
    -- Drop foreign key constraint on brands.user_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%brands_user_id%' 
        AND table_name = 'brands'
    ) THEN
        ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_user_id_fkey;
    END IF;

    -- Drop foreign key constraint on models.user_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%models_user_id%' 
        AND table_name = 'models'
    ) THEN
        ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_user_id_fkey;
    END IF;

    -- Drop foreign key constraint on sellers.user_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%sellers_user_id%' 
        AND table_name = 'sellers'
    ) THEN
        ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;
    END IF;

    -- Drop foreign key constraint on booking_persons.user_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%booking_persons_user_id%' 
        AND table_name = 'booking_persons'
    ) THEN
        ALTER TABLE public.booking_persons DROP CONSTRAINT IF EXISTS booking_persons_user_id_fkey;
    END IF;
END $$;

-- Step 3: Drop indexes on user_id if they exist
DROP INDEX IF EXISTS brands_user_id_idx;
DROP INDEX IF EXISTS models_user_id_idx;
DROP INDEX IF EXISTS sellers_user_id_idx;
DROP INDEX IF EXISTS booking_persons_user_id_idx;

-- Step 4: Remove user_id column from brands table
ALTER TABLE public.brands DROP COLUMN IF EXISTS user_id;

-- Step 5: Remove user_id column from models table
ALTER TABLE public.models DROP COLUMN IF EXISTS user_id;

-- Step 6: Remove user_id column from sellers table
ALTER TABLE public.sellers DROP COLUMN IF EXISTS user_id;

-- Step 7: Remove user_id column from booking_persons table
ALTER TABLE public.booking_persons DROP COLUMN IF EXISTS user_id;

-- Step 8: Drop all unique constraints (except primary keys) before removing duplicates
-- This allows us to safely remove duplicates and then add new constraints
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Drop all unique constraints on brands (except primary key)
    FOR constraint_name_var IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.brands'::regclass 
        AND contype = 'u'
        AND conname NOT LIKE '%_pkey'
    LOOP
        EXECUTE 'ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_var) || ' CASCADE';
    END LOOP;

    -- Drop all unique constraints on models (except primary key)
    FOR constraint_name_var IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.models'::regclass 
        AND contype = 'u'
        AND conname NOT LIKE '%_pkey'
    LOOP
        EXECUTE 'ALTER TABLE public.models DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_var) || ' CASCADE';
    END LOOP;

    -- Drop all unique constraints on sellers (except primary key)
    FOR constraint_name_var IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.sellers'::regclass 
        AND contype = 'u'
        AND conname NOT LIKE '%_pkey'
    LOOP
        EXECUTE 'ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_var) || ' CASCADE';
    END LOOP;

    -- Drop all unique constraints on booking_persons (except primary key)
    FOR constraint_name_var IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.booking_persons'::regclass 
        AND contype = 'u'
        AND conname NOT LIKE '%_pkey'
    LOOP
        EXECUTE 'ALTER TABLE public.booking_persons DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_var) || ' CASCADE';
    END LOOP;
END $$;

-- Step 9: Remove duplicate rows before adding unique constraints
-- This handles cases where the same record exists for multiple users

-- Remove duplicate brands, keeping the one with the earliest created_at
DELETE FROM public.brands
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC, id::text ASC) as rn
        FROM public.brands
    ) t
    WHERE rn > 1
);

-- Remove duplicate models, keeping the one with the earliest created_at
DELETE FROM public.models
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY brand_name, name ORDER BY created_at ASC, id::text ASC) as rn
        FROM public.models
    ) t
    WHERE rn > 1
);

-- Remove duplicate sellers, keeping the one with the earliest created_at
DELETE FROM public.sellers
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC, id::text ASC) as rn
        FROM public.sellers
    ) t
    WHERE rn > 1
);

-- Remove duplicate booking_persons, keeping the one with the earliest created_at
DELETE FROM public.booking_persons
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC, id::text ASC) as rn
        FROM public.booking_persons
    ) t
    WHERE rn > 1
);

-- Step 10: Update unique constraints to remove user_id if they include it
-- For brands: Change UNIQUE (name, user_id) to UNIQUE (name)
DO $$
BEGIN
    -- Check if unique constraint exists on (name, user_id) and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'brands' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%name%user_id%'
    ) THEN
        ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_name_user_id_key;
    END IF;
    
    -- Add unique constraint on name only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'brands' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'brands_name_key'
    ) THEN
        ALTER TABLE public.brands ADD CONSTRAINT brands_name_key UNIQUE (name);
    END IF;
END $$;

-- For models: Change UNIQUE (brand_name, name, user_id) to UNIQUE (brand_name, name)
DO $$
BEGIN
    -- Check if unique constraint exists on (brand_name, name, user_id) and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'models' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%brand_name%name%user_id%'
    ) THEN
        ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_brand_name_name_user_id_key;
    END IF;
    
    -- Add unique constraint on (brand_name, name) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'models' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'models_brand_name_name_key'
    ) THEN
        ALTER TABLE public.models ADD CONSTRAINT models_brand_name_name_key UNIQUE (brand_name, name);
    END IF;
END $$;

-- For sellers: Change UNIQUE (name, user_id) to UNIQUE (name)
DO $$
BEGIN
    -- Check if unique constraint exists on (name, user_id) and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'sellers' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%name%user_id%'
    ) THEN
        ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_name_user_id_key;
    END IF;
    
    -- Add unique constraint on name only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'sellers' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'sellers_name_key'
    ) THEN
        ALTER TABLE public.sellers ADD CONSTRAINT sellers_name_key UNIQUE (name);
    END IF;
END $$;

-- For booking_persons: Change UNIQUE (name, user_id) to UNIQUE (name)
DO $$
BEGIN
    -- Check if unique constraint exists on (name, user_id) and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'booking_persons' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%name%user_id%'
    ) THEN
        ALTER TABLE public.booking_persons DROP CONSTRAINT IF EXISTS booking_persons_name_user_id_key;
    END IF;
    
    -- Add unique constraint on name only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'booking_persons' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'booking_persons_name_key'
    ) THEN
        ALTER TABLE public.booking_persons ADD CONSTRAINT booking_persons_name_key UNIQUE (name);
    END IF;
END $$;

-- Step 10: Create new RLS policies that allow all authenticated users to access these shared tables
-- Brands: All authenticated users can read/write
CREATE POLICY "All authenticated users can access brands"
  ON public.brands
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Models: All authenticated users can read/write
CREATE POLICY "All authenticated users can access models"
  ON public.models
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Sellers: All authenticated users can read/write
CREATE POLICY "All authenticated users can access sellers"
  ON public.sellers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Booking_persons: All authenticated users can read/write
CREATE POLICY "All authenticated users can access booking_persons"
  ON public.booking_persons
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

