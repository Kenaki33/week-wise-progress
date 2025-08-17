import { parseISO } from 'date-fns';

export interface HabitRecordBase {
  week_key: string;
  days: number[];
  habit_name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  // allow extra fields (e.g., user_id)
  [key: string]: any;
}

const isNonEmptyName = (name?: string | null) => !!name && name.trim().length > 0;

const countNonZeroDays = (days: number[] = []) =>
  days.reduce((acc, v) => (v !== 0 ? acc + 1 : acc), 0);

const toTime = (val?: string | null) => {
  if (!val) return 0;
  const d = parseISO(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

/**
 * Choose the "better" record for the same (user, week) in case of duplicates.
 * Priority:
 * 1) non-empty habit_name over empty
 * 2) higher count of non-zero days
 * 3) newer updated_at (fallback to created_at)
 */
const pickBetter = (a: HabitRecordBase, b: HabitRecordBase) => {
  const aHasName = isNonEmptyName(a.habit_name);
  const bHasName = isNonEmptyName(b.habit_name);
  if (aHasName !== bHasName) return aHasName ? a : b;

  const aDays = countNonZeroDays(a.days);
  const bDays = countNonZeroDays(b.days);
  if (aDays !== bDays) return aDays > bDays ? a : b;

  const aTime = toTime(a.updated_at) || toTime(a.created_at);
  const bTime = toTime(b.updated_at) || toTime(b.created_at);
  if (aTime !== bTime) return aTime > bTime ? a : b;

  // fallback: keep "a"
  return a;
};

/**
 * Dedupe an array of habit records so that only one record per week_key remains.
 * Use when you already filtered by user. If the array contains multiple users,
 * call this per-user to avoid cross-user mixing.
 */
export const dedupeHabitsByWeek = <T extends HabitRecordBase>(records: T[]): T[] => {
  const map = new Map<string, T>();
  for (const rec of records || []) {
    const key = rec.week_key;
    const current = map.get(key);
    if (!current) {
      map.set(key, rec);
    } else {
      const better = pickBetter(current, rec);
      map.set(key, better as T);
    }
  }
  return Array.from(map.values());
};
