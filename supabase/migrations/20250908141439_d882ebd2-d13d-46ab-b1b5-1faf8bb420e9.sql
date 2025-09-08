-- Final restore phase: Recalculate and set the correct weekly score for week 2025-36
UPDATE public.habits 
SET 
  weekly_score = 77  -- 7 completed days * 10 points + 7 perfect week bonus
WHERE 
  user_id = '6e823a2b-a430-4837-9f1d-7ca551d7197e' 
  AND week_key = '2025-36';