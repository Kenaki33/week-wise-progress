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
        
        // Get user creation date
        const { data: { user } } = await supabase.auth.getUser();
        const userCreatedAt = user?.created_at ? parseISO(user.created_at) : null;
        
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
              
              // Debug for this specific user
              if (userId === '6e823a2b-a430-4837-9f1d-7ca551d7197e') {
                console.log('Processing week:', {
                  week_key: record.week_key,
                  weekStartDate: format(weekStartDate, 'yyyy-MM-dd'),
                  days: record.days
                });
              }
              
              // Check each day of the week
              record.days.forEach((status: number, dayIndex: number) => {
                const dayDate = addDays(weekStartDate, dayIndex);
                const dayMonth = format(dayDate, 'yyyy-MM');
                const targetMonth = format(selectedDate, 'yyyy-MM');
                
                // Only count days that are within the TARGET MONTH AND from account creation date onwards
                if (dayMonth === targetMonth && 
                    (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt)))) {
                  
                  // Debug for this specific user
                  if (userId === '6e823a2b-a430-4837-9f1d-7ca551d7197e') {
                    console.log('Processing day (FIXED):', {
                      dayDate: format(dayDate, 'yyyy-MM-dd'),
                      dayMonth,
                      targetMonth,
                      status,
                      userCreatedAt: userCreatedAt ? format(userCreatedAt, 'yyyy-MM-dd HH:mm') : 'null',
                      isIncluded: !userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt)),
                      points: status === 1 ? 10 : status === 2 ? -10 : (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) ? -15 : 0
                    });
                  }
                  
                  // Only calculate points if habit name is defined (not empty)
                  if (record.habit_name && record.habit_name.trim()) {
                    if (status === 1) {
                      // Completed task: +10 points
                      totalScore += 10;
                    } else if (status === 2) {
                      // Not completed task: -10 points
                      totalScore -= 10;
                    } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
                      // Unmarked past day: -15 points (only if habit is defined)
                      totalScore -= 15;
                    }
                  }
                  // Future days (status 0) contribute 0 points
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