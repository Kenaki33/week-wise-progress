import { useState, useEffect } from 'react';
import { useUnifiedScoring } from './useUnifiedScoring';

export const useMonthlyScore = (userId?: string, selectedDate?: Date, refreshTrigger?: number) => {
  const [monthlyScore, setMonthlyScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { calculateMonthlyScore } = useUnifiedScoring();

  useEffect(() => {
    if (!userId || !selectedDate) return;

    const fetchMonthlyScore = async () => {
      setLoading(true);
      
      try {
        const score = await calculateMonthlyScore(userId, selectedDate);
        setMonthlyScore(score);
      } catch (error) {
        console.error('Error calculating monthly score:', error);
        setMonthlyScore(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyScore();
  }, [userId, selectedDate, refreshTrigger, calculateMonthlyScore]);

  return { monthlyScore, loading };
};