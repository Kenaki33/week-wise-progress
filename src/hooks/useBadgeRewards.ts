import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BadgeReward {
  id: string;
  badge_type: string;
  points_awarded: number;
  earned_at: string;
}

export const useBadgeRewards = (userId?: string) => {
  const [rewards, setRewards] = useState<BadgeReward[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRewards = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('badge_rewards')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching badge rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const awardBadgePoints = async (badgeType: string, points: number) => {
    if (!userId) return;

    try {
      // Check if this badge type was already rewarded
      const { data: existingReward } = await supabase
        .from('badge_rewards')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_type', badgeType)
        .single();

      if (existingReward) {
        // Badge already rewarded, don't award again
        return;
      }

      // Award the badge points
      const { error } = await supabase
        .from('badge_rewards')
        .insert({
          user_id: userId,
          badge_type: badgeType,
          points_awarded: points
        });

      if (error) throw error;

      // Show success notification
      toast({
        title: "Odznaka zdobyta!",
        description: `Otrzymujesz +${points} punktów za zdobycie odznaki "${badgeType}"!`,
        variant: "default",
      });

      // Refresh rewards
      fetchRewards();
    } catch (error) {
      console.error('Error awarding badge points:', error);
    }
  };

  const getTotalBadgePoints = (): number => {
    return rewards.reduce((total, reward) => total + reward.points_awarded, 0);
  };

  useEffect(() => {
    fetchRewards();
  }, [userId]);

  return {
    rewards,
    loading,
    awardBadgePoints,
    getTotalBadgePoints,
    refetch: fetchRewards
  };
};