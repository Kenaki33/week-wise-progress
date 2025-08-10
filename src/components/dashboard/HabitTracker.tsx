import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addDays, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, X } from 'lucide-react';

interface HabitData {
  habitName: string;
  days: number[]; // 0 = unmarked, 1 = completed, 2 = not completed
  reflection: string;
  weeklyScore: number;
}

interface HabitTrackerProps {
  weekKey: string;
  selectedDate: Date;
  userId?: string;
  onDataChange?: () => void;
}

export const HabitTracker = ({ weekKey, selectedDate, userId, onDataChange }: HabitTrackerProps) => {
  const [habitData, setHabitData] = useState<HabitData>({
    habitName: '',
    days: new Array(7).fill(0), // 0 = unmarked, 1 = completed, 2 = not completed
    reflection: '',
    weeklyScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const { toast } = useToast();

  // Load user creation date
  useEffect(() => {
    if (!userId) return;

    const loadUserCreationDate = async () => {
      try {
        // Use profiles.created_at for consistency with ranking and monthly score
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.error('Error loading user profile:', error);
          return;
        }
        
        if (profile?.created_at) {
          setUserCreatedAt(parseISO(profile.created_at));
        }
      } catch (error) {
        console.error('Error loading user creation date:', error);
      }
    };

    loadUserCreationDate();
  }, [userId]);

  // Load data from Supabase
  useEffect(() => {
    if (!userId) return;

    const loadHabitData = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('week_key', weekKey)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading habit data:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się załadować danych nawyków",
          variant: "destructive",
        });
      } else if (data) {
        setHabitData({
          habitName: data.habit_name || '',
          days: data.days || new Array(7).fill(0),
          reflection: data.reflection || '',
          weeklyScore: data.weekly_score || 0
        });
      } else {
        // Reset for new week
        setHabitData({
          habitName: '',
          days: new Array(7).fill(0),
          reflection: '',
          weeklyScore: 0
        });
      }
      
      setLoading(false);
    };

    loadHabitData();
  }, [weekKey, userId, toast]);

  // Calculate weekly score based on task completion (only if habit name is set)
  const calculateWeeklyScore = (days: number[], weekDates: Date[], habitName: string) => {
    // If no habit name is set, no points are calculated
    if (!habitName.trim()) {
      return 0;
    }
    
    const today = new Date();
    let score = 0;

    days.forEach((status, index) => {
      const dayDate = weekDates[index];
      
      // Only count days from account creation date onwards
      if (userCreatedAt && isBefore(dayDate, startOfDay(userCreatedAt))) {
        return; // Skip days before account creation
      }
      
      if (status === 1) {
        // Completed task: +10 points
        score += 10;
      } else if (status === 2) {
        // Not completed task: -10 points
        score -= 10;
      } else if (status === 0 && (isBefore(dayDate, today) || isToday(dayDate))) {
        // Unmarked past day: -15 points (only if habit is defined)
        score -= 15;
      }
      // Future days (status 0) contribute 0 points
    });

    return score;
  };

  // Calculate dates for each day of the week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday as first day
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  // Auto-save functionality to Supabase
  useEffect(() => {
    if (!userId || loading) return;

    const saveHabitData = async () => {
      const calculatedScore = calculateWeeklyScore(habitData.days, weekDates, habitData.habitName);
      
      const { error } = await supabase
        .from('habits')
        .upsert({
          user_id: userId,
          week_key: weekKey,
          habit_name: habitData.habitName,
          days: habitData.days,
          reflection: habitData.reflection,
          weekly_score: calculatedScore
        }, {
          onConflict: 'user_id,week_key'
        });

      if (error) {
        console.error('Error saving habit data:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się zapisać danych",
          variant: "destructive",
        });
      } else {
        // Update local state with calculated score
        setHabitData(prev => ({ ...prev, weeklyScore: calculatedScore }));
        // Trigger monthly score refresh
        onDataChange?.();
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveHabitData, 1000);
    return () => clearTimeout(timeoutId);
  }, [habitData.habitName, habitData.days, habitData.reflection, weekKey, userId, loading, toast]);

  const updateHabitName = (name: string) => {
    setHabitData(prev => ({ ...prev, habitName: name }));
  };

  const setDayStatus = (dayIndex: number, status: number) => {
    setHabitData(prev => ({
      ...prev,
      days: prev.days.map((currentStatus, index) => 
        index === dayIndex ? status : currentStatus
      )
    }));
  };

  const updateReflection = (reflection: string) => {
    setHabitData(prev => ({ ...prev, reflection }));
  };

  const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  
  const completedDays = habitData.days.filter(status => status === 1).length;
  const completionPercentage = habitData.days.length > 0 ? (completedDays / habitData.days.length) * 100 : 0;
  const currentWeeklyScore = calculateWeeklyScore(habitData.days, weekDates, habitData.habitName);
  
  // Check if habit name is defined to enable/disable buttons
  const isHabitDefined = habitData.habitName.trim().length > 0;
  
  // Check if current week is before account creation date
  // Allow the week if account was created during this week
  const weekEnd = addDays(weekStart, 6);
  const isWeekBeforeAccountCreation = userCreatedAt && isBefore(weekEnd, startOfDay(userCreatedAt));

  if (isWeekBeforeAccountCreation) {
    return (
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <Card className="glass-card hover-lift animate-fade-in">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">
                Ten tydzień jest sprzed założenia Twojego konta
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Konto założone: {userCreatedAt ? format(userCreatedAt, 'dd.MM.yyyy', { locale: pl }) : 'Nieznana data'}
              </p>
              <p className="text-sm text-muted-foreground">
                Nie możesz dodawać nawyków w poprzednich tygodniach
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Habit Goal */}
      <Card className="glass-card hover-lift animate-scale-in">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg sm:text-xl font-semibold gradient-text">
            W tym tygodniu pracuję nad:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Wpisz nawyk, nad którym chcesz pracować..."
            value={habitData.habitName}
            onChange={(e) => updateHabitName(e.target.value)}
            className="modern-input text-base sm:text-lg py-3 px-4"
          />
          {!isHabitDefined && (
            <p className="text-sm text-muted-foreground mt-2 animate-fade-in">
              Wpisz nazwę nawyku, aby móc go śledzić i zdobywać punkty
            </p>
          )}
        </CardContent>
      </Card>

      {/* Daily Tracker */}
      <Card className="glass-card hover-lift animate-scale-in">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground">
            <div className="flex flex-col gap-3">
              <span className="text-lg sm:text-xl font-semibold">Śledzenie tygodniowe</span>
              <div className="flex justify-center gap-4">
                <span className={`px-4 py-2 rounded-full font-semibold text-sm ${
                  completionPercentage >= 70 ? 'bg-success text-success-foreground' : 
                  completionPercentage >= 40 ? 'bg-warning text-warning-foreground' : 
                  'bg-muted text-muted-foreground'
                }`}>
                  {completedDays}/7 dni ({Math.round(completionPercentage)}%)
                </span>
                <span className={`px-4 py-2 rounded-full font-semibold text-sm ${
                  currentWeeklyScore >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {currentWeeklyScore >= 0 ? '+' : ''}{currentWeeklyScore} pkt
                </span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="progress-enhanced">
            <div 
              className="progress-fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {dayNames.map((day, index) => {
              const dayStatus = habitData.days[index];
              const dayDate = weekDates[index];
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Set to start of today for proper comparison
              const isPastOrToday = isBefore(dayDate, today) || isToday(dayDate);
              const isFutureDay = !isPastOrToday;
              
              return (
                <div 
                  key={day} 
                  className={`
                    flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 
                    transition-all duration-300 min-h-[70px]
                    ${dayStatus === 1 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                      : dayStatus === 2
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                      : 'border-border hover:border-primary/50 hover:bg-accent/30'
                    }
                    ${!isHabitDefined ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <Label className={`font-semibold text-sm sm:text-base ${
                      dayStatus === 1 
                        ? 'text-green-700 dark:text-green-300' 
                        : dayStatus === 2
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-foreground'
                    }`}>
                      {day}
                    </Label>
                    <span className={`text-xs sm:text-sm font-medium truncate ${
                      dayStatus === 1 
                        ? 'text-green-600 dark:text-green-400' 
                        : dayStatus === 2
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                    }`}>
                      {format(dayDate, 'd MMMM', { locale: pl })}
                    </span>
                  </div>
                   
                  <div className="flex gap-2 ml-3">
                    <Button
                      variant={dayStatus === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDayStatus(index, dayStatus === 1 ? 0 : 1)}
                      className={`${dayStatus === 1 ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20'}`}
                      disabled={isFutureDay || !isHabitDefined}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant={dayStatus === 2 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDayStatus(index, dayStatus === 2 ? 0 : 2)}
                      className={`${dayStatus === 2 ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'}`}
                      disabled={isFutureDay || !isHabitDefined}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Reflection */}
      <Card className="glass-card hover-lift animate-scale-in">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg sm:text-xl font-semibold gradient-text">
            Refleksja tygodniowa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Jak poszedł ten tydzień? Jakie były wyzwania? Co chcesz poprawić?"
            value={habitData.reflection}
            onChange={(e) => updateReflection(e.target.value)}
            rows={4}
            className="modern-input resize-none text-sm sm:text-base"
          />
        </CardContent>
      </Card>
    </div>
  );
};