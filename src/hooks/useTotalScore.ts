import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, addDays, isBefore, isToday, parseISO, startOfDay } from 'date-fns';

export const useTotalScore = (userId?: string, refreshTrigger?: number) => {
  const [totalScore, setTotalScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchTotalScore = async () => {
      setLoading(true);
      
      try {
        // Get user creation date
        const { data: profileData } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', userId)
          .single();
        
        const userCreatedAt = profileData?.created_at ? parseISO(profileData.created_at) : null;
        
        // Get all habit records for this user
        const { data, error } = await supabase
          .from('habits')
          .select('week_key, days, habit_name')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching total score:', error);
          setTotalScore(0);
        } else {
          let total = 0;
          
          // Process each week's data to calculate total points
          data?.forEach(record => {
            if (record.days && Array.isArray(record.days)) {
              // Parse week_key to get the week start date (format: YYYY-WW)
              const [year, week] = record.week_key.split('-');
              const yearStart = new Date(parseInt(year), 0, 1);
              const weekStartDate = startOfWeek(addDays(yearStart, (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
              
              // Check each day of the week
              record.days.forEach((status: number, dayIndex: number) => {
                const dayDate = addDays(weekStartDate, dayIndex);
                
                // Only count days from account creation date onwards
                if (!userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt))) {
                  // Only calculate points if habit name is defined (not empty)
                  if (record.habit_name && record.habit_name.trim()) {
                    if (status === 1) {
                      // Completed task: +10 points
                      total += 10;
                    } else if (status === 2) {
                      // Not completed task: -10 points
                      total -= 10;
                    } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
                      // Unmarked past day: -15 points (only if habit is defined)
                      total -= 15;
                    }
                  }
                  // Future days (status 0) contribute 0 points
                }
              });
            }
          });
          
          setTotalScore(total);
        }
      } catch (error) {
        console.error('Error calculating total score:', error);
        setTotalScore(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTotalScore();
  }, [userId, refreshTrigger]);

  return { totalScore, loading };
};