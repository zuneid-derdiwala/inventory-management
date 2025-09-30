-- Create the profiles table
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    username text UNIQUE,
    email text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add user_id to existing data tables
ALTER TABLE public.entries ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE public.brands ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE public.models ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE public.sellers ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE public.booking_persons ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;

-- Create indexes for faster lookups
CREATE INDEX ON public.entries (user_id);
CREATE INDEX ON public.brands (user_id);
CREATE INDEX ON public.models (user_id);
CREATE INDEX ON public.sellers (user_id);
CREATE INDEX ON public.booking_persons (user_id);