import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { calculateMonthlyScores } from './useScoring';
import { dedupeHabitsByWeek } from '@/utils/habitsDedup';
import { useBadgeRewards } from './useBadgeRewards';

export interface MonthlyScoreBreakdown {
  weeklyScores: { weekKey: string; score: number; }[];
  perfectWeekBonuses: number;
  badgeRewards: number;
  totalScore: number;
}

export const useMonthlyScore = (userId?: string, selectedDate?: Date, refreshTrigger?: number) => {
  const [monthlyScore, setMonthlyScore] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<MonthlyScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const { rewards } = useBadgeRewards(userId);

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
        
        // Get all habit records (include timestamps for safe dedupe)
        const { data, error } = await supabase
          .from('habits')
          .select('week_key, days, habit_name, updated_at, created_at')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching monthly score:', error);
          setBreakdown(null);
          setMonthlyScore(0);
        } else {
          const safeData = dedupeHabitsByWeek(data || []);
          const monthlyScores = calculateMonthlyScores(safeData, userCreatedAt);
          const targetMonth = format(selectedDate, 'yyyy-MM');
          const monthData = monthlyScores[targetMonth];
          const score = monthData?.points || 0;
          
          // Calculate badge rewards for this month
          const monthRewards = rewards.filter(reward => {
            const rewardDate = parseISO(reward.earned_at);
            return format(rewardDate, 'yyyy-MM') === targetMonth;
          });
          const badgePoints = monthRewards.reduce((sum, reward) => sum + reward.points_awarded, 0);
          
          // Create breakdown
          const weeklyScores = monthData?.weeks.map(week => ({
            weekKey: week.weekKey,
            score: week.totalWeekScore
          })) || [];
          
          const perfectWeekBonuses = weeklyScores.reduce((sum, week) => {
            const weekData = monthData?.weeks.find(w => w.weekKey === week.weekKey);
            return sum + (weekData?.perfectWeekBonus || 0);
          }, 0);
          
          setBreakdown({
            weeklyScores,
            perfectWeekBonuses,
            badgeRewards: badgePoints,
            totalScore: score + badgePoints
          });
          
          setMonthlyScore(score + badgePoints);
        }
      } catch (error) {
        console.error('Error calculating monthly score:', error);
        setBreakdown(null);
        setMonthlyScore(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyScore();
  }, [userId, selectedDate, refreshTrigger, rewards]);

  return { monthlyScore, breakdown, loading };
};