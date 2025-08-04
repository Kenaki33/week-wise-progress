-- Drop the existing days column and recreate it with integer array
ALTER TABLE public.habits DROP COLUMN days;

-- Add the new days column with integer array to support completion states
-- 0 = unmarked, 1 = completed, 2 = not completed
ALTER TABLE public.habits 
ADD COLUMN days integer[] NOT NULL DEFAULT ARRAY[0, 0, 0, 0, 0, 0, 0];

-- Add weekly_score column to track points for the week
ALTER TABLE public.habits 
ADD COLUMN weekly_score integer DEFAULT 0;