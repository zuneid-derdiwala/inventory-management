-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create entries table
CREATE TABLE public.entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    imei TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    seller TEXT,
    booking_person TEXT,
    inward_date TIMESTAMP WITH TIME ZONE,
    inward_amount NUMERIC,
    buyer TEXT,
    outward_date TIMESTAMP WITH TIME ZONE,
    outward_amount NUMERIC,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (imei, user_id) -- IMEI must be unique per user
);

-- Create brands table
CREATE TABLE public.brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (name, user_id) -- Brand name must be unique per user
);

-- Create models table
CREATE TABLE public.models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_name TEXT NOT NULL, -- Storing brand_name directly for simplicity, could be FK to brands.id
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (brand_name, name, user_id) -- Model name must be unique per brand and per user
);

-- Create sellers table
CREATE TABLE public.sellers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (name, user_id) -- Seller name must be unique per user
);

-- Create booking_persons table
CREATE TABLE public.booking_persons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (name, user_id) -- Booking person name must be unique per user
);