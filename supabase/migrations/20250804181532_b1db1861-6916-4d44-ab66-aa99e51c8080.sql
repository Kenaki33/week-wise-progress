-- Add nickname column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN nickname TEXT UNIQUE NOT NULL DEFAULT '';

-- Add constraint to ensure nickname starts with uppercase letter
ALTER TABLE public.profiles 
ADD CONSTRAINT nickname_starts_uppercase 
CHECK (nickname ~ '^[A-Z]');

-- Add constraint to ensure nickname length
ALTER TABLE public.profiles 
ADD CONSTRAINT nickname_length 
CHECK (length(nickname) >= 3 AND length(nickname) <= 20);