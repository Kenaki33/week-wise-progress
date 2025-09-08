-- Add unique index for (user_id, week_key)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_habits_user_week ON public.habits(user_id, week_key);

-- Attach/update triggers on public.habits
DROP TRIGGER IF EXISTS trg_reset_habit_data_on_name_change ON public.habits;
CREATE TRIGGER trg_reset_habit_data_on_name_change
BEFORE UPDATE ON public.habits
FOR EACH ROW
EXECUTE FUNCTION public.reset_habit_data_on_name_change();

DROP TRIGGER IF EXISTS trg_enforce_habit_change_after_low_completion ON public.habits;
CREATE TRIGGER trg_enforce_habit_change_after_low_completion
BEFORE INSERT OR UPDATE ON public.habits
FOR EACH ROW
EXECUTE FUNCTION public.enforce_habit_change_after_low_completion();

DROP TRIGGER IF EXISTS trg_update_habits_updated_at ON public.habits;
CREATE TRIGGER trg_update_habits_updated_at
BEFORE UPDATE ON public.habits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();