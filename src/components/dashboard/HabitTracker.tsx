import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';

interface HabitData {
  habitName: string;
  days: boolean[];
  reflection: string;
}

interface HabitTrackerProps {
  weekKey: string;
  selectedDate: Date;
  userId?: string;
}

export const HabitTracker = ({ weekKey, selectedDate, userId }: HabitTrackerProps) => {
  const [habitData, setHabitData] = useState<HabitData>({
    habitName: '',
    days: new Array(7).fill(false),
    reflection: ''
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
          days: data.days || new Array(7).fill(false),
          reflection: data.reflection || ''
        });
      } else {
        // Reset for new week
        setHabitData({
          habitName: '',
          days: new Array(7).fill(false),
          reflection: ''
        });
      }
      
      setLoading(false);
    };

    loadHabitData();
  }, [weekKey, userId, toast]);

  // Auto-save functionality to Supabase
  useEffect(() => {
    if (!userId || loading) return;

    const saveHabitData = async () => {
      const { error } = await supabase
        .from('habits')
        .upsert({
          user_id: userId,
          week_key: weekKey,
          habit_name: habitData.habitName,
          days: habitData.days,
          reflection: habitData.reflection
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
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveHabitData, 1000);
    return () => clearTimeout(timeoutId);
  }, [habitData, weekKey, userId, loading, toast]);

  const updateHabitName = (name: string) => {
    setHabitData(prev => ({ ...prev, habitName: name }));
  };

  const toggleDay = (dayIndex: number) => {
    setHabitData(prev => ({
      ...prev,
      days: prev.days.map((checked, index) => 
        index === dayIndex ? !checked : checked
      )
    }));
  };

  const updateReflection = (reflection: string) => {
    setHabitData(prev => ({ ...prev, reflection }));
  };

  const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  const completedDays = habitData.days.filter(Boolean).length;
  const completionPercentage = habitData.days.length > 0 ? (completedDays / habitData.days.length) * 100 : 0;

  // Calculate dates for each day of the week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday as first day
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

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
              <div className="flex justify-center">
                <span className={`px-4 py-2 rounded-full font-semibold text-sm ${
                  completionPercentage >= 70 ? 'bg-success text-success-foreground' : 
                  completionPercentage >= 40 ? 'bg-warning text-warning-foreground' : 
                  'bg-muted text-muted-foreground'
                }`}>
                  {completedDays}/7 dni ({Math.round(completionPercentage)}%)
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
            {dayNames.map((day, index) => (
              <div 
                key={day} 
                className={`
                  flex items-center space-x-3 p-3 sm:p-4 rounded-xl border-2 
                  transition-all duration-300 cursor-pointer min-h-[80px]
                  ${habitData.days[index] 
                    ? 'border-success bg-success-light hover:shadow-lg' 
                    : 'border-border hover:border-primary/50 hover:bg-accent/30'
                  }
                `}
                onClick={() => toggleDay(index)}
              >
                <Checkbox
                  id={`day-${index}`}
                  checked={habitData.days[index]}
                  onCheckedChange={() => toggleDay(index)}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success flex-shrink-0"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <Label 
                    htmlFor={`day-${index}`} 
                    className={`font-semibold cursor-pointer transition-colors text-sm sm:text-base ${
                      habitData.days[index] ? 'text-success' : 'text-foreground'
                    }`}
                  >
                    {day}
                  </Label>
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
                    {format(weekDates[index], 'd MMMM', { locale: pl })}
                  </span>
                </div>
              </div>
            ))}
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