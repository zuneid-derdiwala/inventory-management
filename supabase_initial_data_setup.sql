-- Drop tables if they exist to ensure a clean start
DROP TABLE IF EXISTS public.entries CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.models CASCADE;
DROP TABLE IF EXISTS public.sellers CASCADE;
DROP TABLE IF EXISTS public.booking_persons CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE; -- Drop profiles table as well if no auth

-- Create the 'entries' table
CREATE TABLE public.entries (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create the 'brands' table
CREATE TABLE public.brands (
    name text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create the 'models' table
CREATE TABLE public.models (
    brand_name text NOT NULL,
    name text NOT NULL,
    PRIMARY KEY (brand_name, name),
    FOREIGN KEY (brand_name) REFERENCES public.brands(name) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create the 'sellers' table
CREATE TABLE public.sellers (
    name text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create the 'booking_persons' table
CREATE TABLE public.booking_persons (
    name text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- No RLS or auth-related functions needed for a non-authenticated app.