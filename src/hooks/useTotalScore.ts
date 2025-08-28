import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseISO } from 'date-fns';
import { calculateTotalScore } from './useScoring';
import { useBadgeRewards } from './useBadgeRewards';

export const useTotalScore = (userId?: string, refreshTrigger?: number) => {
  const [totalScore, setTotalScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { getTotalBadgePoints } = useBadgeRewards(userId);

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
          const badgePoints = getTotalBadgePoints();
          const total = calculateTotalScore(data || [], userCreatedAt, badgePoints);
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