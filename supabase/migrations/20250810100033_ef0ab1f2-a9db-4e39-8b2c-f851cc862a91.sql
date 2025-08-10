-- Fix weekly_score for week 2025-32 which still has 0 despite completed days
UPDATE habits 
SET weekly_score = 70
WHERE user_id = '6e823a2b-a430-4837-9f1d-7ca551d7197e' 
AND week_key = '2025-32'
AND weekly_score = 0;