-- Helper: Monday date from ISO week key RRRR-II
CREATE OR REPLACE FUNCTION public.iso_week_key_monday(week_key text)
RETURNS date
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT to_date(split_part($1,'-',1) || '-' || split_part($1,'-',2) || '-1', 'IYYY-IW-ID')::date;
$$;

-- Helper: previous ISO week key for a given key
CREATE OR REPLACE FUNCTION public.prev_iso_week_key(week_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT to_char((public.iso_week_key_monday($1) - interval '7 days')::date, 'IYYY') || '-' ||
         to_char((public.iso_week_key_monday($1) - interval '7 days')::date, 'IW');
$$;

-- Enforce rule: if previous week completion < 67% (counting only days after signup),
-- you cannot set a different habit name in the immediate next week.
CREATE OR REPLACE FUNCTION public.enforce_habit_change_after_low_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  prev_key text;
  prev_rec public.habits%ROWTYPE;
  prev_monday date;
  user_created_at timestamptz;
  countable_days int := 0;
  completed_count int := 0;
  i int;
  day_date date;
  prev_name text;
  pct numeric;
  error_msg text;
BEGIN
  -- If name not changing on UPDATE, skip check
  IF TG_OP = 'UPDATE' AND NEW.habit_name IS NOT DISTINCT FROM OLD.habit_name THEN
    RETURN NEW;
  END IF;

  -- Previous week key for this NEW.week_key
  prev_key := public.prev_iso_week_key(NEW.week_key);

  -- Fetch previous week record for same user
  SELECT * INTO prev_rec
  FROM public.habits
  WHERE user_id = NEW.user_id AND week_key = prev_key
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no previous week data, allow
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  prev_name := COALESCE(prev_rec.habit_name, '');

  -- If previous week had no habit name, allow
  IF prev_name = '' THEN
    RETURN NEW;
  END IF;

  -- Read user's signup time from profiles (created at signup)
  SELECT created_at INTO user_created_at
  FROM public.profiles
  WHERE user_id = NEW.user_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no profile row, allow (shouldn't happen if signup flow is correct)
  IF user_created_at IS NULL THEN
    RETURN NEW;
  END IF;

  prev_monday := public.iso_week_key_monday(prev_key);

  -- Compute countable days (>= signup date) and completed among those
  FOR i IN 0..6 LOOP
    day_date := prev_monday + i;
    IF day_date >= date_trunc('day', user_created_at)::date THEN
      countable_days := countable_days + 1;
      IF COALESCE(prev_rec.days[i+1], 0) = 1 THEN
        completed_count := completed_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- If nothing to count (e.g., account created after the week), allow
  IF countable_days = 0 THEN
    RETURN NEW;
  END IF;

  pct := completed_count::numeric / countable_days::numeric;

  -- If below 67% and user attempts to change the habit name in the next week, block it
  IF pct < 0.67 AND NEW.habit_name IS DISTINCT FROM prev_name THEN
    error_msg := 'Nie można zmienić nawyku w tygodniu ' || NEW.week_key || 
                 ', ponieważ w poprzednim tygodniu (' || prev_key || 
                 ', ukończono ' || completed_count || ' z ' || countable_days || 
                 ' dni = ' || round(pct*100, 1) || '%) nie osiągnięto wymaganego progu 67%. ' ||
                 'Kontynuuj ten sam nawyk: "' || prev_name || '".';
    RAISE EXCEPTION '%', error_msg USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach trigger to habits table (fires on insert and on habit_name updates)
DROP TRIGGER IF EXISTS trg_enforce_habit_change_after_low_completion ON public.habits;
CREATE TRIGGER trg_enforce_habit_change_after_low_completion
  BEFORE INSERT OR UPDATE OF habit_name ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_habit_change_after_low_completion();