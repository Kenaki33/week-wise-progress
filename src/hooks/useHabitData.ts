import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek } from 'date-fns';

export interface HabitWeekData {
  habitName: string;
  days: boolean[];
  completedDays: number;
  completionPercentage: number;
}

export const useHabitData = (userId?: string) => {
  const [habitsByWeek, setHabitsByWeek] = useState<Record<string, HabitWeekData>>({});
  const [loading, setLoading] = useState(false);

  const getWeekKey = (date: Date) => {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const weekNumber = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  };

  const loadHabitData = async (date: Date) => {
    if (!userId) return null;

    const weekKey = getWeekKey(date);
    
    // Return cached data if available
    if (habitsByWeek[weekKey]) {
      return habitsByWeek[weekKey];
    }

    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('week_key', weekKey)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading habit data:', error);
        return null;
      }

      const habitData: HabitWeekData = {
        habitName: data?.habit_name || '',
        days: data?.days || new Array(7).fill(false),
        completedDays: 0,
        completionPercentage: 0
      };

      habitData.completedDays = habitData.days.filter(Boolean).length;
      habitData.completionPercentage = habitData.days.length > 0 ? (habitData.completedDays / habitData.days.length) * 100 : 0;

      // Cache the data
      setHabitsByWeek(prev => ({
        ...prev,
        [weekKey]: habitData
      }));

      return habitData;
    } catch (error) {
      console.error('Error loading habit data:', error);
      return null;
    }
  };

  const getWeekProgressColor = (date: Date): string => {
    const today = new Date();
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    
    // Future weeks - gray
    if (weekStart > today) {
      return 'bg-muted text-muted-foreground';
    }

    const weekKey = getWeekKey(date);
    const habitData = habitsByWeek[weekKey];

    // No habit data - default
    if (!habitData || !habitData.habitName.trim()) {
      return 'bg-muted text-muted-foreground';
    }

    const completedDays = habitData.completedDays;

    // Color based on completion
    if (completedDays <= 3) {
      return 'bg-red-500 text-white'; // Red for 0-3 days
    } else if (completedDays <= 6) {
      return 'bg-yellow-500 text-white'; // Yellow for 4-6 days
    } else {
      return 'bg-green-500 text-white'; // Green for 7 days
    }
  };

  return {
    habitsByWeek,
    loadHabitData,
    getWeekProgressColor,
    loading
  };
};