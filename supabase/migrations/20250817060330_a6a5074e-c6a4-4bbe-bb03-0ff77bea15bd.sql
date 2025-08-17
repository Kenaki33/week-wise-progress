-- Dodaj trigger który wyzeruje days, reflection i weekly_score gdy habit_name się zmieni
CREATE OR REPLACE FUNCTION public.reset_habit_data_on_name_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Sprawdź czy habit_name się zmienił
  IF OLD.habit_name IS DISTINCT FROM NEW.habit_name THEN
    -- Wyzeruj dane tygodnia
    NEW.days = ARRAY[0,0,0,0,0,0,0];
    NEW.reflection = '';
    NEW.weekly_score = 0;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Dodaj trigger do tabeli habits
CREATE TRIGGER reset_habit_data_on_name_change_trigger
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_habit_data_on_name_change();