import { format, parse, startOfISOWeek } from 'date-fns';

// ISO week utilities to ensure consistent week keys and week boundaries
// Week key format: RRRR-II (ISO week-numbering year + ISO week number)
export const getISOWeekKey = (date: Date): string => {
  return `${format(date, 'RRRR')}-${format(date, 'II')}`;
};

// Legacy calculator kept for backward compatibility when loading old records
export const getLegacyWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-${weekNumber.toString().padStart(2, '0')}`;
};

// Convert an ISO week key back to the actual week start (Monday)
export const getWeekStartDateFromKey = (weekKey: string): Date => {
  const [isoYear, isoWeek] = weekKey.split('-');
  // Parse Monday (ISO day 1) of the given ISO week/year
  const parsed = parse(`${isoYear}-${isoWeek}-1`, 'RRRR-II-i', new Date());
  return startOfISOWeek(parsed);
};
