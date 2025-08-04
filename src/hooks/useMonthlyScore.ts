import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const useMonthlyScore = (userId?: string, selectedDate?: Date) => {
  const [monthlyScore, setMonthlyScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !selectedDate) return;

    const fetchMonthlyScore = async () => {
      setLoading(true);
      
      try {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        
        // Get all habit records for the current month
        const { data, error } = await supabase
          .from('habits')
          .select('weekly_score')
          .eq('user_id', userId)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (error) {
          console.error('Error fetching monthly score:', error);
          setMonthlyScore(0);
        } else {
          const totalScore = data?.reduce((sum, record) => sum + (record.weekly_score || 0), 0) || 0;
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
  }, [userId, selectedDate]);

  return { monthlyScore, loading };
};