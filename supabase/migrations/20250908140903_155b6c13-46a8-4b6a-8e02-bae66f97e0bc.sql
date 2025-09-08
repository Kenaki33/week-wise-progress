-- Restore the previous week (2025-36) with correct habit data
UPDATE public.habits 
SET 
  habit_name = 'Dzielenie się wiedzą',
  days = ARRAY[1,1,1,1,1,1,1],
  weekly_score = 77  -- 7 days * 10 points + 7 perfect week bonus
WHERE 
  user_id = '6e823a2b-a430-4837-9f1d-7ca551d7197e' 
  AND week_key = '2025-36';