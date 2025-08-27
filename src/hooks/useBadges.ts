import { calculateWeekScore } from './useScoring';
import { dedupeHabitsByWeek } from '@/utils/habitsDedup';

export interface BadgeCounts {
  masterWeek: number;
  masterMonth: number;
}

// Calculate badge counts based on habit data
export const computeBadgeCounts = (habitsData: any[], userCreatedAt: Date | null): BadgeCounts => {
  if (!habitsData || habitsData.length === 0) {
    return { masterWeek: 0, masterMonth: 0 };
  }

  // Deduplicate habits by week
  const dedupedHabits = dedupeHabitsByWeek(habitsData);
  
  // Group by week and calculate weekly scores
  const weekScores: { [weekKey: string]: { score: number; percentage: number } } = {};
  
  dedupedHabits.forEach(habit => {
    const weekScore = calculateWeekScore(
      habit.week_key,
      habit.days || [0, 0, 0, 0, 0, 0, 0],
      habit.habit_name || '',
      userCreatedAt
    );
    
    const validDays = weekScore.validDaysCount;
    const completedDays = weekScore.completedDaysCount;
    const percentage = validDays > 0 ? completedDays / validDays : 0;
    
    weekScores[habit.week_key] = {
      score: weekScore.totalWeekScore,
      percentage
    };
  });

  // Count master week badges (85% or more completion)
  const masterWeekCount = Object.values(weekScores).filter(
    week => week.percentage >= 0.85
  ).length;

  // Count master month badges (4 consecutive weeks with 85%+ each)
  const sortedWeeks = Object.entries(weekScores)
    .filter(([_, week]) => week.percentage >= 0.85)
    .map(([weekKey, _]) => weekKey)
    .sort();

  let masterMonthCount = 0;
  let currentStreak = 0;

  for (let i = 0; i < sortedWeeks.length; i++) {
    const currentWeek = sortedWeeks[i];
    const nextWeek = sortedWeeks[i + 1];
    
    // Check if this week is consecutive to the previous
    if (i === 0 || isConsecutiveWeek(sortedWeeks[i - 1], currentWeek)) {
      currentStreak++;
    } else {
      // Reset streak
      currentStreak = 1;
    }
    
    // Check if next week is not consecutive or we're at the end
    if (!nextWeek || !isConsecutiveWeek(currentWeek, nextWeek)) {
      // End of streak, count complete months
      masterMonthCount += Math.floor(currentStreak / 4);
      currentStreak = 0;
    }
  }

  return {
    masterWeek: masterWeekCount,
    masterMonth: masterMonthCount
  };
};

// Helper function to check if two weeks are consecutive
const isConsecutiveWeek = (week1: string, week2: string): boolean => {
  const [year1, weekNum1] = week1.split('-').map(Number);
  const [year2, weekNum2] = week2.split('-').map(Number);
  
  if (year1 === year2) {
    return weekNum2 === weekNum1 + 1;
  } else if (year2 === year1 + 1) {
    // Check if week1 is the last week of year1 and week2 is the first week of year2
    return weekNum1 >= 52 && weekNum2 === 1;
  }
  
  return false;
};