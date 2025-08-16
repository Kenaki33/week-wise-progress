-- Delete incorrect week records for Kenaki user
DELETE FROM habits 
WHERE user_id = (SELECT user_id FROM profiles WHERE nickname = 'Kenaki') 
AND week_key IN ('2025-32', '2025-42');