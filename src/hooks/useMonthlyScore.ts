import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { calculateMonthlyScores } from './useScoring';

export const useMonthlyScore = (userId?: string, selectedDate?: Date, refreshTrigger?: number) => {
  const [monthlyScore, setMonthlyScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !selectedDate) return;

    const fetchMonthlyScore = async () => {
      setLoading(true);
      
      try {
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
        
        // Get all habit records
        const { data, error } = await supabase
          .from('habits')
          .select('week_key, days, habit_name')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching monthly score:', error);
          setMonthlyScore(0);
        } else {
          const monthlyScores = calculateMonthlyScores(data || [], userCreatedAt);
          const targetMonth = format(selectedDate, 'yyyy-MM');
          const score = monthlyScores[targetMonth]?.points || 0;
          setMonthlyScore(score);
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