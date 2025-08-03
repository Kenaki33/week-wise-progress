import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface HabitData {
  habitName: string;
  days: boolean[];
  reflection: string;
}

interface HabitTrackerProps {
  weekKey: string;
  userId?: string;
}

export const HabitTracker = ({ weekKey, userId }: HabitTrackerProps) => {
  const [habitData, setHabitData] = useState<HabitData>({
    habitName: '',
    days: new Array(7).fill(false),
    reflection: ''
  });

  // Simulate loading data from Supabase (will be replaced when Supabase is connected)
  useEffect(() => {
    // For now, load from localStorage as a fallback
    const storageKey = `habit-${userId}-${weekKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setHabitData(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading habit data:', error);
      }
    } else {
      // Reset for new week
      setHabitData({
        habitName: '',
        days: new Array(7).fill(false),
        reflection: ''
      });
    }
  }, [weekKey, userId]);

  // Auto-save functionality (will be replaced with Supabase when connected)
  useEffect(() => {
    const storageKey = `habit-${userId}-${weekKey}`;
    localStorage.setItem(storageKey, JSON.stringify(habitData));
  }, [habitData, weekKey, userId]);

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

  return (
    <div className="space-y-6">
      {/* Habit Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-header">W tym tygodniu pracuję nad:</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Wpisz nawyk, nad którym chcesz pracować..."
            value={habitData.habitName}
            onChange={(e) => updateHabitName(e.target.value)}
            className="text-lg"
          />
        </CardContent>
      </Card>

      {/* Daily Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-header flex items-center justify-between">
            <span>Śledzenie tygodniowe</span>
            <div className="text-sm font-normal">
              <span className={`px-3 py-1 rounded-full text-white ${
                completionPercentage >= 70 ? 'bg-success' : 
                completionPercentage >= 40 ? 'bg-warning text-warning-foreground' : 
                'bg-muted text-muted-foreground'
              }`}>
                {completedDays}/7 dni ({Math.round(completionPercentage)}%)
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dayNames.map((day, index) => (
              <div key={day} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`day-${index}`}
                  checked={habitData.days[index]}
                  onCheckedChange={() => toggleDay(index)}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                />
                <Label 
                  htmlFor={`day-${index}`} 
                  className={`font-medium cursor-pointer ${
                    habitData.days[index] ? 'text-success' : 'text-foreground'
                  }`}
                >
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Reflection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-header">Refleksja tygodniowa</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Jak poszedł ten tydzień? Jakie były wyzwania? Co chcesz poprawić?"
            value={habitData.reflection}
            onChange={(e) => updateReflection(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
};