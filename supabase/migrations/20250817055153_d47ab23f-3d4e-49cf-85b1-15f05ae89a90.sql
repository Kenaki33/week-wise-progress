
-- 1) Usuń duplikaty: zostaw 1 rekord na (user_id, week_key)
WITH ranked AS (
  SELECT
    id,
    user_id,
    week_key,
    habit_name,
    weekly_score,
    created_at,
    updated_at,
    -- priorytet: niepusty habit_name
    CASE WHEN trim(coalesce(habit_name, '')) <> '' THEN 1 ELSE 0 END AS has_name,
    -- liczba dni z oznaczeniem (≠ 0)
    (SELECT COUNT(*) FROM unnest(days) AS d(val) WHERE val <> 0) AS nonzero_days,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, week_key
      ORDER BY
        CASE WHEN trim(coalesce(habit_name, '')) <> '' THEN 1 ELSE 0 END DESC,
        (SELECT COUNT(*) FROM unnest(days) AS d(val) WHERE val <> 0) DESC,
        weekly_score DESC,
        updated_at DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM public.habits
)
DELETE FROM public.habits h
USING ranked r
WHERE h.id = r.id
  AND r.rn > 1;

-- 2) Trwałe zabezpieczenie: unikalny indeks na (user_id, week_key)
CREATE UNIQUE INDEX IF NOT EXISTS habits_user_id_week_key_uidx
ON public.habits (user_id, week_key);

-- 3) Auto-aktualizacja updated_at przy UPDATE (jeśli nie ma triggera)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_on_habits'
  ) THEN
    CREATE TRIGGER set_timestamp_on_habits
    BEFORE UPDATE ON public.habits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
