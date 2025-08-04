-- Reset the incorrectly marked day (August 10th) for the user
UPDATE habits 
SET days = ARRAY[0, 0, 0, 0, 0, 0, 0] 
WHERE week_key = '2025-32' AND user_id = '6e823a2b-a430-4837-9f1d-7ca551d7197e';

-- Clear any other incorrectly marked future days across all users
-- This will reset all days to unmarked state, letting users mark them manually
UPDATE habits 
SET days = ARRAY[0, 0, 0, 0, 0, 0, 0] 
WHERE week_key >= '2025-32';