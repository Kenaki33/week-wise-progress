-- Second-phase restore: set days after name already set (trigger won't reset now)
UPDATE public.habits 
SET 
  days = ARRAY[1,1,1,1,1,1,1]
WHERE 
  user_id = '6e823a2b-a430-4837-9f1d-7ca551d7197e' 
  AND week_key = '2025-36';