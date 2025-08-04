-- Update habits table to support task completion states
-- Change days array to store completion states: 0 = unmarked, 1 = completed, 2 = not completed
ALTER TABLE public.habits 
ALTER COLUMN days TYPE integer[] 
USING ARRAY[0, 0, 0, 0, 0, 0, 0];

-- Update default value for days column
ALTER TABLE public.habits 
ALTER COLUMN days SET DEFAULT ARRAY[0, 0, 0, 0, 0, 0, 0];

-- Add weekly_score column to track points for the week
ALTER TABLE public.habits 
ADD COLUMN weekly_score integer DEFAULT 0;