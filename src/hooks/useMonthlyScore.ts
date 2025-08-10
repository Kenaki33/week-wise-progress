import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, startOfWeek, addDays, isBefore, isToday, isWithinInterval, parseISO, startOfDay } from 'date-fns';

export const useMonthlyScore = (userId?: string, selectedDate?: Date, refreshTrigger?: number) => {
  const [monthlyScore, setMonthlyScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !selectedDate) return;

    const fetchMonthlyScore = async () => {
      setLoading(true);
      
      try {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        
        // Get user creation date from profiles (same source as Ranking)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          setMonthlyScore(0);
          setLoading(false);
          return;
        }

        const userCreatedAt = profile?.created_at ? parseISO(profile.created_at) : null;
        
        // Get all habit records that have weeks overlapping with the current month
        const { data, error } = await supabase
          .from('habits')
          .select('week_key, days, habit_name')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching monthly score:', error);
          setMonthlyScore(0);
        } else {
          let totalScore = 0;
          
          // Process each week's data to calculate points for days within the current month
          data?.forEach(record => {
            if (record.days && Array.isArray(record.days)) {
              // Parse week_key to get the week start date (format: YYYY-WW)
              const [year, week] = record.week_key.split('-');
              const yearStart = new Date(parseInt(year), 0, 1);
              const weekStartDate = startOfWeek(addDays(yearStart, (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
              
              // Check each day of the week
              record.days.forEach((status: number, dayIndex: number) => {
                const dayDate = addDays(weekStartDate, dayIndex);
                const dayMonth = format(dayDate, 'yyyy-MM');
                const targetMonth = format(selectedDate, 'yyyy-MM');
                
                // Only count days that are within the TARGET MONTH AND from account creation date onwards
                if (dayMonth === targetMonth && 
                    (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt)))) {
                  
                  // Only calculate points if habit name is defined (not empty)
                  if (record.habit_name && record.habit_name.trim()) {
                    let dayScore = 0;
                    
                    if (status === 1) {
                      // Completed task: +10 points
                      dayScore = 10;
                    } else if (status === 2) {
                      // Not completed task: -10 points
                      dayScore = -10;
                    } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
                      // Unmarked past day: -15 points (only if habit is defined)
                      dayScore = -15;
                    }
                    // Future days (status 0) contribute 0 points
                    
                    totalScore += dayScore;
                  }
                }
              });
            }
          });
          
          setMonthlyScore(totalScore);
        }
      } catch (error) {
        console.error('Error calculating monthly score:', error);
        setMonthlyScore(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyScore();
  }, [userId, selectedDate, refreshTrigger]);

  return { monthlyScore, loading };
};