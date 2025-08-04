import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addDays, isBefore, isToday } from 'date-fns';
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
}

export const HabitTracker = ({ weekKey, selectedDate, userId }: HabitTrackerProps) => {
  const [habitData, setHabitData] = useState<HabitData>({
    habitName: '',
    days: new Array(7).fill(0), // 0 = unmarked, 1 = completed, 2 = not completed
    reflection: '',
    weeklyScore: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  // Calculate weekly score based on task completion
  const calculateWeeklyScore = (days: number[], weekDates: Date[]) => {
    const today = new Date();
    let score = 0;

    days.forEach((status, index) => {
      const dayDate = weekDates[index];
      
      if (status === 1) {
        // Completed task: +10 points
        score += 10;
      } else if (status === 2) {
        // Not completed task: -10 points
        score -= 10;
      } else if (status === 0 && (isBefore(dayDate, today) || isToday(dayDate))) {
        // Unmarked past day: -15 points
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
      const calculatedScore = calculateWeeklyScore(habitData.days, weekDates);
      
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
  const currentWeeklyScore = calculateWeeklyScore(habitData.days, weekDates);

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Habit Goal */}
      <Card className="enhanced-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg sm:text-xl font-semibold">
            W tym tygodniu pracuję nad:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Wpisz nawyk, nad którym chcesz pracować..."
            value={habitData.habitName}
            onChange={(e) => updateHabitName(e.target.value)}
            className="text-base sm:text-lg py-3 px-4 border-2 focus:border-primary transition-colors"
          />
        </CardContent>
      </Card>

      {/* Daily Tracker */}
      <Card className="enhanced-card">
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
              const isPastDay = isBefore(dayDate, today) || isToday(dayDate);
              const isFutureDay = !isPastDay;
              
              return (
                <div 
                  key={day} 
                  className={`
                    flex flex-col p-3 sm:p-4 rounded-xl border-2 
                    transition-all duration-300 min-h-[120px]
                    ${dayStatus === 1 
                      ? 'border-green-500 bg-green-50' 
                      : dayStatus === 2
                      ? 'border-red-500 bg-red-50'
                      : 'border-border hover:border-primary/50 hover:bg-accent/30'
                    }
                  `}
                >
                  <div className="flex flex-col flex-1 min-w-0 mb-3">
                    <Label className="font-semibold text-sm sm:text-base text-foreground">
                      {day}
                    </Label>
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
                      {format(dayDate, 'd MMMM', { locale: pl })}
                    </span>
                    {isFutureDay && (
                      <span className="text-xs text-muted-foreground mt-1">
                        ◎ Przyszły dzień (0 pkt)
                      </span>
                    )}
                    {dayStatus === 0 && isPastDay && (
                      <span className="text-xs text-orange-600 mt-1">
                        ❔ Nie zaznaczono (-15 pkt)
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant={dayStatus === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDayStatus(index, dayStatus === 1 ? 0 : 1)}
                      className={`flex-1 ${dayStatus === 1 ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                      disabled={isFutureDay}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      ✔ (+10)
                    </Button>
                    
                    <Button
                      variant={dayStatus === 2 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDayStatus(index, dayStatus === 2 ? 0 : 2)}
                      className={`flex-1 ${dayStatus === 2 ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                      disabled={isFutureDay}
                    >
                      <X className="w-4 h-4 mr-1" />
                      ✖ (-10)
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Reflection */}
      <Card className="enhanced-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg sm:text-xl font-semibold">
            Refleksja tygodniowa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Jak poszedł ten tydzień? Jakie były wyzwania? Co chcesz poprawić?"
            value={habitData.reflection}
            onChange={(e) => updateReflection(e.target.value)}
            rows={4}
            className="resize-none border-2 focus:border-primary transition-colors text-sm sm:text-base"
          />
        </CardContent>
      </Card>
    </div>
  );
};