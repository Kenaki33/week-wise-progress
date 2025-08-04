-- Add unique constraint for nicknames
ALTER TABLE public.profiles ADD CONSTRAINT profiles_nickname_unique UNIQUE (nickname);

-- Add column to track last nickname change
ALTER TABLE public.profiles ADD COLUMN last_nickname_change TIMESTAMP WITH TIME ZONE DEFAULT now();