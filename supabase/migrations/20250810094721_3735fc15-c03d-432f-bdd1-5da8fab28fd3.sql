-- Fix the weekly_score for existing records where it's incorrectly 0
-- For records with habit_name and completed days, recalculate the weekly_score

UPDATE habits 
SET weekly_score = (
  CASE 
    WHEN habit_name IS NOT NULL AND TRIM(habit_name) != '' THEN
      (SELECT 
        COALESCE(
          (SELECT COUNT(*) FROM unnest(days) AS d WHERE d = 1) * 10 - 
          (SELECT COUNT(*) FROM unnest(days) AS d WHERE d = 2) * 10,
          0
        )
      )
    ELSE 0
  END
)
WHERE user_id = '6e823a2b-a430-4837-9f1d-7ca551d7197e' 
AND weekly_score = 0 
AND habit_name IS NOT NULL 
AND TRIM(habit_name) != '';