import { format, startOfWeek, addDays, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { getWeekStartDateFromKey } from '@/utils/weekKey';

export interface WeekScore {
  weekKey: string;
  weekStartDate: Date;
  dailyPoints: number;
  perfectWeekBonus: number;
  totalWeekScore: number;
  validDaysCount: number;
  completedDaysCount: number;
}

export interface MonthlyScore {
  month: string;
  points: number;
  weeks: WeekScore[];
}

/**
 * Calculates points for a single day based on status and date
 */
export const calculateDayPoints = (
  status: number,
  dayDate: Date,
  userCreatedAt: Date | null,
  hasHabitName: boolean
): number => {
  // Don't count days before account creation
  if (userCreatedAt && isBefore(dayDate, startOfDay(userCreatedAt))) {
    return 0;
  }

  // Don't count if no habit is set
  if (!hasHabitName) {
    return 0;
  }

  if (status === 1) {
    return 10; // Completed: +10 points
  } else if (status === 2) {
    return -10; // Not completed: -10 points
  } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
    return -15; // Unmarked past day: -15 points
  }
  
  return 0; // Future days: 0 points
};

/**
 * Calculates score for a single week
 */
export const calculateWeekScore = (
  weekKey: string,
  days: number[],
  habitName: string,
  userCreatedAt: Date | null
): WeekScore => {
  // Parse week_key to get the week start date (format: YYYY-WW)
  const weekStartDate = getWeekStartDateFromKey(weekKey);
  
  const hasHabitName = habitName && habitName.trim() !== '';
  let dailyPoints = 0;
  let validDaysCount = 0;
  let completedDaysCount = 0;

  // Calculate daily points
  days.forEach((status: number, dayIndex: number) => {
    const dayDate = addDays(weekStartDate, dayIndex);
    
    // Only count days from account creation onwards
    if (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt))) {
      validDaysCount++;
      
      const dayPoints = calculateDayPoints(status, dayDate, userCreatedAt, hasHabitName);
      dailyPoints += dayPoints;
      
      if (status === 1 && hasHabitName) {
        completedDaysCount++;
      }
    }
  });

  // Calculate perfect week bonus
  const perfectWeekBonus = (validDaysCount > 0 && completedDaysCount === validDaysCount && hasHabitName) ? 10 : 0;
  
  return {
    weekKey,
    weekStartDate,
    dailyPoints,
    perfectWeekBonus,
    totalWeekScore: dailyPoints + perfectWeekBonus,
    validDaysCount,
    completedDaysCount
  };
};

/**
 * Calculates which month gets the perfect week bonus for weeks crossing month boundaries
 */
export const getMonthForPerfectWeekBonus = (
  weekStartDate: Date,
  userCreatedAt: Date | null
): string => {
  // Count days in each month for this week
  const monthCounts: { [month: string]: number } = {};
  
  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStartDate, i);
    
    // Only count days from account creation onwards
    if (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt))) {
      const monthKey = format(dayDate, 'yyyy-MM');
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }
  }
  
  // Return the month with the most days (or first month if tied)
  let maxCount = 0;
  let targetMonth = '';
  
  Object.entries(monthCounts).forEach(([month, count]) => {
    if (count > maxCount) {
      maxCount = count;
      targetMonth = month;
    }
  });
  
  return targetMonth;
};

/**
 * Calculates monthly scores from habit data
 */
export const calculateMonthlyScores = (
  habitsData: any[],
  userCreatedAt: Date | null
): { [month: string]: MonthlyScore } => {
  const monthlyScores: { [month: string]: MonthlyScore } = {};
  
  habitsData?.forEach(record => {
    if (!record.days || !Array.isArray(record.days)) return;
    
    const weekScore = calculateWeekScore(
      record.week_key,
      record.days,
      record.habit_name,
      userCreatedAt
    );
    
    // Determine which month this week primarily belongs to
    const primaryMonth = getMonthForPerfectWeekBonus(weekScore.weekStartDate, userCreatedAt);
    
    // First, ensure all months for this week exist in monthlyScores
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayDate = addDays(weekScore.weekStartDate, dayIndex);
      
      // Only count days from account creation onwards
      if (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt))) {
        const monthKey = format(dayDate, 'yyyy-MM');
        
        if (!monthlyScores[monthKey]) {
          monthlyScores[monthKey] = {
            month: monthKey,
            points: 0,
            weeks: []
          };
        }
      }
    }
    
    // Add this week to the primary month's weeks array
    if (primaryMonth && monthlyScores[primaryMonth]) {
      // Check if this week is already added to avoid duplicates
      const existingWeek = monthlyScores[primaryMonth].weeks.find(w => w.weekKey === weekScore.weekKey);
      if (!existingWeek) {
        monthlyScores[primaryMonth].weeks.push(weekScore);
      }
    }
    
    // Then distribute daily points to months
    record.days.forEach((status: number, dayIndex: number) => {
      const dayDate = addDays(weekScore.weekStartDate, dayIndex);
      
      // Only count days from account creation onwards
      if (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt))) {
        const monthKey = format(dayDate, 'yyyy-MM');
        
        const dayPoints = calculateDayPoints(
          status,
          dayDate,
          userCreatedAt,
          record.habit_name && record.habit_name.trim() !== ''
        );
        
        monthlyScores[monthKey].points += dayPoints;
      }
    });
    
    // Finally, add perfect week bonus to the appropriate month
    if (weekScore.perfectWeekBonus > 0) {
      const bonusMonth = getMonthForPerfectWeekBonus(weekScore.weekStartDate, userCreatedAt);
      if (bonusMonth && monthlyScores[bonusMonth]) {
        monthlyScores[bonusMonth].points += weekScore.perfectWeekBonus;
      }
    }
  });
  
  return monthlyScores;
};

/**
 * Calculates total score from all time including badge rewards
 */
export const calculateTotalScore = (
  habitsData: any[],
  userCreatedAt: Date | null,
  badgeRewardPoints: number = 0
): number => {
  let totalScore = 0;
  
  habitsData?.forEach(record => {
    if (!record.days || !Array.isArray(record.days)) return;
    
    const weekScore = calculateWeekScore(
      record.week_key,
      record.days,
      record.habit_name,
      userCreatedAt
    );
    
    totalScore += weekScore.totalWeekScore;
  });
  
  // Add badge reward points
  totalScore += badgeRewardPoints;
  
  return totalScore;
};