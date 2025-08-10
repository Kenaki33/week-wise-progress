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
          .select('week_key, days, habit_name, weekly_score')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching monthly score:', error);
          setMonthlyScore(0);
        } else {
          let totalScore = 0;
          
          // Process each week's data - use the calculated weekly_score for weeks that overlap with target month
          data?.forEach(record => {
            if (record.days && Array.isArray(record.days)) {
              // Parse week_key to get the week start date (format: YYYY-WW)
              const [year, week] = record.week_key.split('-');
              const yearStart = new Date(parseInt(year), 0, 1);
              const weekStartDate = startOfWeek(addDays(yearStart, (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
              
              // Check if this week has any days in the target month
              let hasTargetMonthDays = false;
              for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const dayDate = addDays(weekStartDate, dayIndex);
                const dayMonth = format(dayDate, 'yyyy-MM');
                const targetMonth = format(selectedDate, 'yyyy-MM');
                
                if (dayMonth === targetMonth && 
                    (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt)))) {
                  hasTargetMonthDays = true;
                  break;
                }
              }
              
              // If this week has days in target month and has a habit name, use the weekly_score
              if (hasTargetMonthDays && record.habit_name && record.habit_name.trim()) {
                totalScore += record.weekly_score || 0;
              }
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