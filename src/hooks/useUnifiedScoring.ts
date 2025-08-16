import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, startOfWeek, addDays, isBefore, isToday, parseISO, startOfDay, isAfter } from 'date-fns';

interface MonthlyScore {
  month: string;
  year: number;
  points: number;
  displayName: string;
}

type NutritionPersonality = 'ekspresowy_konsument' | 'emocjonalny_podjadacz' | 'beztroski_lasuch' | 'nieswiadomy_zjadacz' | 'perfekcjonista_dietetyczny' | 'wieczny_odchudzacz' | 'ogarniety_odzywiacze';

interface UserScore {
  user_id: string;
  nickname: string;
  nutrition_personality: NutritionPersonality;
  monthly_score: number;
  total_score: number;
  created_at: string;
}

/**
 * Unified scoring calculation hook
 * Provides consistent scoring across all components (Header, History, Ranking)
 */
export const useUnifiedScoring = () => {
  const calculateMonthlyScore = async (userId: string, selectedDate: Date): Promise<number> => {
    try {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const targetMonth = format(selectedDate, 'yyyy-MM');
      
      // Get user creation date from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.created_at) {
        throw new Error('Cannot fetch user profile');
      }

      const userCreatedAt = parseISO(profile.created_at);
      
      // Get all habit records for the user
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('week_key, days, habit_name')
        .eq('user_id', userId);

      if (habitsError) {
        throw new Error('Cannot fetch habits');
      }

      let totalMonthlyScore = 0;

      habits?.forEach(habit => {
        if (habit.days && Array.isArray(habit.days) && habit.habit_name && habit.habit_name.trim()) {
          // Parse week_key to get the week start date (format: YYYY-WW)
          const [year, week] = habit.week_key.split('-');
          const yearStart = new Date(parseInt(year), 0, 1);
          const weekStartDate = startOfWeek(addDays(yearStart, (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
          
          let weeklyCompletedDays = 0;
          let weeklyValidDaysCount = 0;
          let weeklyMonthlyScore = 0;
          
          // Check each day of the week
          habit.days.forEach((status: number, dayIndex: number) => {
            const dayDate = addDays(weekStartDate, dayIndex);
            const dayMonth = format(dayDate, 'yyyy-MM');
            
            // Only count days from account creation date onwards and in target month
            if (!isBefore(dayDate, startOfDay(userCreatedAt)) && dayMonth === targetMonth) {
              weeklyValidDaysCount++;
              
              let dayScore = 0;
              if (status === 1) {
                // Completed task: +10 points
                dayScore = 10;
                weeklyCompletedDays++;
              } else if (status === 2) {
                // Not completed task: -10 points
                dayScore = -10;
              } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
                // Unmarked past day: -15 points
                dayScore = -15;
              }
              
              weeklyMonthlyScore += dayScore;
            }
          });
          
          // Add perfect week bonus (+10) if all valid days completed
          // But only if this week has days in the target month
          if (weeklyValidDaysCount > 0) {
            // Check if all days in the ENTIRE week are completed (not just target month days)
            let allWeekCompletedDays = 0;
            let allWeekValidDaysCount = 0;
            
            habit.days.forEach((status: number, dayIndex: number) => {
              const dayDate = addDays(weekStartDate, dayIndex);
              
              if (!isBefore(dayDate, startOfDay(userCreatedAt))) {
                allWeekValidDaysCount++;
                if (status === 1) {
                  allWeekCompletedDays++;
                }
              }
            });
            
            // Perfect week bonus if ALL valid days in the week are completed
            if (allWeekValidDaysCount > 0 && allWeekCompletedDays === allWeekValidDaysCount) {
              weeklyMonthlyScore += 10;
            }
          }
          
          totalMonthlyScore += weeklyMonthlyScore;
        }
      });

      return totalMonthlyScore;
    } catch (error) {
      console.error('Error calculating monthly score:', error);
      return 0;
    }
  };

  const calculateAllMonthlyScores = async (userId: string): Promise<MonthlyScore[]> => {
    try {
      // Get user creation date from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.created_at) {
        throw new Error('Cannot fetch user profile');
      }

      const userCreatedAt = parseISO(profile.created_at);
      
      // Get all habit records for the user
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('week_key, days, habit_name')
        .eq('user_id', userId);

      if (habitsError) {
        throw new Error('Cannot fetch habits');
      }

      // Initialize all months from account creation to current month
      const monthlyPoints: { [key: string]: MonthlyScore } = {};
      const now = new Date();
      const accountStartMonth = startOfMonth(userCreatedAt);
      
      let currentMonth = new Date(accountStartMonth);
      while (!isAfter(currentMonth, now)) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        monthlyPoints[monthKey] = {
          month: monthKey,
          year: currentMonth.getFullYear(),
          points: 0,
          displayName: format(currentMonth, 'MMMM yyyy')
        };
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }

      // Process habit data to calculate monthly points
      habits?.forEach(habit => {
        if (habit.days && Array.isArray(habit.days) && habit.habit_name && habit.habit_name.trim()) {
          // Parse week_key to get the week start date (format: YYYY-WW)
          const [year, week] = habit.week_key.split('-');
          const yearStart = new Date(parseInt(year), 0, 1);
          const weekStartDate = startOfWeek(addDays(yearStart, (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
          
          let weeklyCompletedDays = 0;
          let weeklyValidDaysCount = 0;
          const weekMonthlyContributions: { [monthKey: string]: number } = {};
          
          // Check each day of the week
          habit.days.forEach((status: number, dayIndex: number) => {
            const dayDate = addDays(weekStartDate, dayIndex);
            
            // Only count days from account creation date onwards
            if (!isBefore(dayDate, startOfDay(userCreatedAt))) {
              weeklyValidDaysCount++;
              const monthKey = format(dayDate, 'yyyy-MM');
              
              if (monthlyPoints[monthKey]) {
                let dayScore = 0;
                if (status === 1) {
                  // Completed task: +10 points
                  dayScore = 10;
                  weeklyCompletedDays++;
                } else if (status === 2) {
                  // Not completed task: -10 points
                  dayScore = -10;
                } else if (status === 0 && (isBefore(dayDate, now) || isToday(dayDate))) {
                  // Unmarked past day: -15 points
                  dayScore = -15;
                }
                
                monthlyPoints[monthKey].points += dayScore;
                
                // Track which months this week contributes to
                if (!weekMonthlyContributions[monthKey]) {
                  weekMonthlyContributions[monthKey] = 0;
                }
                weekMonthlyContributions[monthKey] += dayScore;
              }
            }
          });
          
          // Add perfect week bonus (+10) if all valid days completed
          if (weeklyValidDaysCount > 0 && weeklyCompletedDays === weeklyValidDaysCount) {
            // Distribute bonus to all months that this week contributes to
            Object.keys(weekMonthlyContributions).forEach(monthKey => {
              if (monthlyPoints[monthKey]) {
                monthlyPoints[monthKey].points += 10;
              }
            });
          }
        }
      });

      return Object.values(monthlyPoints)
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
      
    } catch (error) {
      console.error('Error calculating all monthly scores:', error);
      return [];
    }
  };

  const calculateUserScores = async (users: any[]): Promise<UserScore[]> => {
    try {
      // Get all habits for all users
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('user_id, days, week_key, habit_name');

      if (habitsError) {
        throw new Error('Cannot fetch habits');
      }

      const currentDate = new Date();
      const currentMonth = format(currentDate, 'yyyy-MM');

      const usersWithScores = users.map(profile => {
        const userHabits = habits?.filter(habit => habit.user_id === profile.user_id) || [];
        
        let monthlyScore = 0;
        let totalScore = 0;
        
        const userCreatedAt = parseISO(profile.created_at);

        userHabits.forEach(habit => {
          if (habit.days && Array.isArray(habit.days) && habit.habit_name && habit.habit_name.trim()) {
            // Parse week_key to get the week start date (format: YYYY-WW)
            const [year, week] = habit.week_key.split('-');
            const yearStart = new Date(parseInt(year), 0, 1);
            const weekStartDate = startOfWeek(addDays(yearStart, (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
            
            let weekScore = 0;
            let weeklyCompletedDays = 0;
            let weeklyValidDaysCount = 0;
            let weeklyMonthlyScore = 0;
            
            // Check each day of the week
            habit.days.forEach((status: number, dayIndex: number) => {
              const dayDate = addDays(weekStartDate, dayIndex);
              
              // Only count days from account creation date onwards
              if (!isBefore(dayDate, startOfDay(userCreatedAt))) {
                weeklyValidDaysCount++;
                const dayMonth = format(dayDate, 'yyyy-MM');
                
                let dayScore = 0;
                if (status === 1) {
                  // Completed task: +10 points
                  dayScore = 10;
                  weeklyCompletedDays++;
                } else if (status === 2) {
                  // Not completed task: -10 points
                  dayScore = -10;
                } else if (status === 0 && (isBefore(dayDate, currentDate) || isToday(dayDate))) {
                  // Unmarked past day: -15 points
                  dayScore = -15;
                }
                
                weekScore += dayScore;
                
                // Monthly score: only current month days
                if (dayMonth === currentMonth) {
                  weeklyMonthlyScore += dayScore;
                }
              }
            });
            
            // Add perfect week bonus (+10) if all valid days completed
            if (weeklyValidDaysCount > 0 && weeklyCompletedDays === weeklyValidDaysCount) {
              weekScore += 10;
              
              // Check if this week contributes to current month for bonus
              const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
              const hasCurrentMonthDays = weekDates.some(date => 
                format(date, 'yyyy-MM') === currentMonth && 
                !isBefore(date, startOfDay(userCreatedAt))
              );
              
              if (hasCurrentMonthDays) {
                weeklyMonthlyScore += 10;
              }
            }
            
            totalScore += weekScore;
            monthlyScore += weeklyMonthlyScore;
          }
        });

        return {
          user_id: profile.user_id,
          nickname: profile.nickname,
          nutrition_personality: profile.nutrition_personality,
          monthly_score: monthlyScore,
          total_score: totalScore,
          created_at: profile.created_at
        };
      });

      return usersWithScores.sort((a, b) => b.monthly_score - a.monthly_score);
      
    } catch (error) {
      console.error('Error calculating user scores:', error);
      return [];
    }
  };

  return {
    calculateMonthlyScore,
    calculateAllMonthlyScores,
    calculateUserScores
  };
};