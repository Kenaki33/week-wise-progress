import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addDays, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, X, Save, Edit2, Info, AlertTriangle, Dice1 } from 'lucide-react';
import { HabitWheelDialog } from '../HabitWheelDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateDayPoints, calculateWeekScore } from '@/hooks/useScoring';
import { getLegacyWeekKey, getISOWeekKey } from '@/utils/weekKey';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isHabitSaved, setIsHabitSaved] = useState(false);
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
  const [confirmationWord, setConfirmationWord] = useState('');
  const [tempHabitName, setTempHabitName] = useState('');
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const [habitChangeBlocked, setHabitChangeBlocked] = useState(false);
  const [habitBlockReason, setHabitBlockReason] = useState('');
  const [showHabitWheel, setShowHabitWheel] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  // Check if habit change is blocked due to low previous week completion
  useEffect(() => {
    if (!userId || !userCreatedAt) return;

    const checkHabitChangeRestriction = async () => {
      try {
        // Helper functions to calculate previous week key
        const getPreviousWeekKey = (currentWeekKey: string): string => {
          const [isoYear, isoWeek] = currentWeekKey.split('-');
          const currentMonday = new Date();
          currentMonday.setFullYear(parseInt(isoYear));
          const jan4 = new Date(parseInt(isoYear), 0, 4);
          const firstMonday = new Date(jan4.getTime() - (jan4.getDay() - 1) * 86400000);
          firstMonday.setTime(firstMonday.getTime() + (parseInt(isoWeek) - 1) * 7 * 86400000);
          const prevMonday = new Date(firstMonday.getTime() - 7 * 86400000);
          const prevYear = prevMonday.getFullYear();
          const jan4Prev = new Date(prevYear, 0, 4);
          const firstMondayPrev = new Date(jan4Prev.getTime() - (jan4Prev.getDay() - 1) * 86400000);
          const weekNumber = Math.floor((prevMonday.getTime() - firstMondayPrev.getTime()) / (7 * 86400000)) + 1;
          return `${prevYear}-${weekNumber.toString().padStart(2, '0')}`;
        };

        const prevWeekKey = getPreviousWeekKey(weekKey);
        
        // Get previous week data
        const { data: prevWeekData } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .eq('week_key', prevWeekKey)
          .maybeSingle();

        if (!prevWeekData || !prevWeekData.habit_name?.trim()) {
          setHabitChangeBlocked(false);
          setHabitBlockReason('');
          return;
        }

        // Calculate previous week completion
        const [prevIsoYear, prevIsoWeek] = prevWeekKey.split('-');
        const prevMonday = new Date();
        prevMonday.setFullYear(parseInt(prevIsoYear));
        const jan4 = new Date(parseInt(prevIsoYear), 0, 4);
        const firstMonday = new Date(jan4.getTime() - (jan4.getDay() - 1) * 86400000);
        firstMonday.setTime(firstMonday.getTime() + (parseInt(prevIsoWeek) - 1) * 7 * 86400000);

        let countableDays = 0;
        let completedCount = 0;

        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(firstMonday.getTime() + i * 86400000);
          const userStartDate = new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), userCreatedAt.getDate());
          
          if (dayDate >= userStartDate) {
            countableDays++;
            if (prevWeekData.days[i] === 1) {
              completedCount++;
            }
          }
        }

        if (countableDays === 0) {
          setHabitChangeBlocked(false);
          setHabitBlockReason('');
          return;
        }

        const completionPct = completedCount / countableDays;
        
        if (completionPct < 0.67) {
          setHabitChangeBlocked(true);
          setHabitBlockReason(
            `Nie można zmienić nawyku, ponieważ w poprzednim tygodniu (${prevWeekKey}, ukończono ${completedCount} z ${countableDays} dni = ${Math.round(completionPct * 100)}%) nie osiągnięto wymaganego progu 67%. Kontynuuj ten sam nawyk: "${prevWeekData.habit_name}".`
          );
        } else {
          setHabitChangeBlocked(false);
          setHabitBlockReason('');
        }
      } catch (error) {
        console.error('Error checking habit change restriction:', error);
        setHabitChangeBlocked(false);
        setHabitBlockReason('');
      }
    };

    checkHabitChangeRestriction();
  }, [weekKey, userId, userCreatedAt]);

  // Load data from Supabase
  useEffect(() => {
    if (!userId || !userCreatedAt) return;

    const loadHabitData = async () => {
      setLoading(true);
      
      console.log('Loading habit data for week:', weekKey, 'user:', userId);
      
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
        console.log('Found existing habit data:', data);
        setHabitData({
          habitName: data.habit_name || '',
          days: data.days || new Array(7).fill(0),
          reflection: data.reflection || '',
          weeklyScore: data.weekly_score || 0
        });
        setIsHabitSaved(!!data.habit_name?.trim());
      } else {
        // No current week data - check if we should auto-copy from previous week
        await handleNoCurrentWeekData();
      }

      setLoading(false);
      setHasUserInteracted(false); // Reset interaction flag after loading
    };

    const handleNoCurrentWeekData = async () => {
      // First try legacy fallback
      const legacyKey = getLegacyWeekKey(selectedDate);
      const { data: legacyData, error: legacyError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('week_key', legacyKey)
        .maybeSingle();

      if (legacyError && legacyError.code !== 'PGRST116') {
        console.error('Error loading legacy habit data:', legacyError);
      }

      if (legacyData) {
        console.warn('Loaded legacy habit data using key:', legacyKey);
        setHabitData({
          habitName: legacyData.habit_name || '',
          days: legacyData.days || new Array(7).fill(0),
          reflection: legacyData.reflection || '',
          weeklyScore: legacyData.weekly_score || 0
        });
        setIsHabitSaved(!!legacyData.habit_name?.trim());
        return;
      }

      // No legacy data - check if we should auto-copy from previous week
      const getPreviousWeekKey = (currentWeekKey: string): string => {
        const [isoYear, isoWeek] = currentWeekKey.split('-');
        const currentMonday = new Date();
        currentMonday.setFullYear(parseInt(isoYear));
        const jan4 = new Date(parseInt(isoYear), 0, 4);
        const firstMonday = new Date(jan4.getTime() - (jan4.getDay() - 1) * 86400000);
        firstMonday.setTime(firstMonday.getTime() + (parseInt(isoWeek) - 1) * 7 * 86400000);
        const prevMonday = new Date(firstMonday.getTime() - 7 * 86400000);
        const prevYear = prevMonday.getFullYear();
        const jan4Prev = new Date(prevYear, 0, 4);
        const firstMondayPrev = new Date(jan4Prev.getTime() - (jan4Prev.getDay() - 1) * 86400000);
        const weekNumber = Math.floor((prevMonday.getTime() - firstMondayPrev.getTime()) / (7 * 86400000)) + 1;
        return `${prevYear}-${weekNumber.toString().padStart(2, '0')}`;
      };

      const prevWeekKey = getPreviousWeekKey(weekKey);
      
      // Get previous week data
      const { data: prevWeekData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('week_key', prevWeekKey)
        .maybeSingle();

      if (!prevWeekData || !prevWeekData.habit_name?.trim()) {
        // No previous week or no habit name - start fresh
        console.log('No existing data found, creating fresh week');
        setHabitData({
          habitName: '',
          days: new Array(7).fill(0),
          reflection: '',
          weeklyScore: 0
        });
        setIsHabitSaved(false);
        return;
      }

      // Calculate previous week completion to decide auto-copy
      const [prevIsoYear, prevIsoWeek] = prevWeekKey.split('-');
      const prevMonday = new Date();
      prevMonday.setFullYear(parseInt(prevIsoYear));
      const jan4 = new Date(parseInt(prevIsoYear), 0, 4);
      const firstMonday = new Date(jan4.getTime() - (jan4.getDay() - 1) * 86400000);
      firstMonday.setTime(firstMonday.getTime() + (parseInt(prevIsoWeek) - 1) * 7 * 86400000);

      let countableDays = 0;
      let completedCount = 0;

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(firstMonday.getTime() + i * 86400000);
        const userStartDate = new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), userCreatedAt.getDate());
        
        if (dayDate >= userStartDate) {
          countableDays++;
          if (prevWeekData.days[i] === 1) {
            completedCount++;
          }
        }
      }

      const COMPLETION_THRESHOLD = 0.67;
      
      if (countableDays > 0 && (completedCount / countableDays) < COMPLETION_THRESHOLD) {
        // Auto-copy habit name from previous week due to low completion
        console.log(`Auto-copying habit "${prevWeekData.habit_name}" from previous week due to ${Math.round((completedCount / countableDays) * 100)}% completion (below ${Math.round(COMPLETION_THRESHOLD * 100)}%)`);
        setHabitData({
          habitName: prevWeekData.habit_name,
          days: new Array(7).fill(0),
          reflection: '',
          weeklyScore: 0
        });
        setIsHabitSaved(true); // Mark as saved since we auto-copied
      } else {
        // Normal fresh start
        console.log('No existing data found, creating fresh week');
        setHabitData({
          habitName: '',
          days: new Array(7).fill(0),
          reflection: '',
          weeklyScore: 0
        });
        setIsHabitSaved(false);
      }
    };

    loadHabitData();
  }, [weekKey, userId, userCreatedAt, toast]);

  // Calculate valid days count and completed days for progress tracking
  const getProgressData = () => {
    if (!userCreatedAt) return { validDaysCount: 7, completedDaysCount: 0 };
    
    let validDaysCount = 0;
    let completedDaysCount = 0;
    
    weekDates.forEach((dayDate, index) => {
      // Only count days from account creation onwards
      if (!isBefore(dayDate, startOfDay(userCreatedAt))) {
        validDaysCount++;
        if (habitData.days[index] === 1) {
          completedDaysCount++;
        }
      }
    });
    
    return { validDaysCount, completedDaysCount };
  };

  // Check if a day should be counted (after account creation)
  const isDayValid = (dayDate: Date) => {
    return !userCreatedAt || !isBefore(dayDate, startOfDay(userCreatedAt));
  };

  // Get day points breakdown for detailed scoring
  const getDayPointsBreakdown = () => {
    const hasHabitName = habitData.habitName && habitData.habitName.trim() !== '';
    return weekDates.map((dayDate, index) => {
      const status = habitData.days[index];
      const points = calculateDayPoints(status, dayDate, userCreatedAt, hasHabitName);
      const isValid = isDayValid(dayDate);
      
      let reason = '';
      if (!isValid) {
        reason = 'Dzień nie liczony (konto od ' + format(userCreatedAt!, 'dd.MM', { locale: pl }) + ')';
      } else if (!hasHabitName) {
        reason = 'Brak nazwy nawyku';
      } else if (status === 1) {
        reason = 'Wykonane (+10)';
      } else if (status === 2) {
        reason = 'Niewykonane (-10)';
      } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
        reason = 'Nieoznaczone w przeszłości (-15)';
      } else {
        reason = 'Przyszły dzień (0)';
      }
      
      return {
        date: dayDate,
        status,
        points,
        reason,
        isValid
      };
    });
  };

  // Calculate dates for each day of the week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday as first day
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  // Auto-save functionality to Supabase
  useEffect(() => {
    if (!userId || loading || !hasUserInteracted) return;
    
    // Don't auto-save if we don't have a habit name or any marked days
    // This prevents saving empty/default state when switching weeks
    if (!habitData.habitName.trim() && habitData.days.every(day => day === 0)) {
      return;
    }

    const saveHabitData = async () => {
      // Calculate dates for the week inside useEffect to avoid dependency issues
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
      
      const weekScore = calculateWeekScore(weekKey, habitData.days, habitData.habitName, userCreatedAt);
      const calculatedScore = weekScore.totalWeekScore;
      
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
      // Show specific error message if it's about habit change restriction
      if (error.code === '23514' && error.message.includes('Nie można zmienić nawyku')) {
        toast({
          title: "Ograniczenie zmiany nawyku",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się zapisać danych",
          variant: "destructive",
        });
      }
    } else {
        // Update local state with calculated score only if it changed
        setHabitData(prev => {
          if (prev.weeklyScore !== calculatedScore) {
            onDataChange?.(); // Trigger monthly score refresh only on score change
          }
          return { ...prev, weeklyScore: calculatedScore };
        });
      }
    };

    // Faster debounce for more responsive feel
    const timeoutId = setTimeout(saveHabitData, 200);
    return () => clearTimeout(timeoutId);
  }, [habitData.habitName, habitData.days, habitData.reflection, weekKey, userId, loading, selectedDate, userCreatedAt, toast, onDataChange]);

  const updateHabitName = (name: string) => {
    // Don't allow changing habit name if blocked
    if (habitChangeBlocked && name !== habitData.habitName) {
      toast({
        title: "Ograniczenie",
        description: habitBlockReason,
        variant: "destructive",
      });
      return;
    }
    setHasUserInteracted(true);
    setHabitData(prev => ({ ...prev, habitName: name }));
  };

  const handleHabitWheelSelection = (selectedHabit: string) => {
    updateHabitName(selectedHabit);
    toast({
      title: "Nawyk wylosowany!",
      description: `Wybrano: ${selectedHabit}`,
    });
  };

  const setDayStatus = (dayIndex: number, status: number) => {
    // Check if this is a past week that shouldn't be editable
    const currentWeekKey = getISOWeekKey(new Date());
    const isPastWeek = weekKey < currentWeekKey;
    
    if (isPastWeek) {
      toast({
        title: "Ograniczenie edycji",
        description: "Nie można edytować poprzednich tygodni po rozpoczęciu nowego tygodnia.",
        variant: "destructive",
      });
      return;
    }
    
    setHasUserInteracted(true);
    setHabitData(prev => ({
      ...prev,
      days: prev.days.map((currentStatus, index) => 
        index === dayIndex ? status : currentStatus
      )
    }));
  };

  const updateReflection = (reflection: string) => {
    setHasUserInteracted(true);
    setHabitData(prev => ({ ...prev, reflection }));
  };

  const handleSaveHabit = async () => {
    if (!habitData.habitName.trim()) {
      toast({
        title: "Błąd",
        description: "Musisz wpisać nazwę nawyku",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('habits')
      .upsert({
        user_id: userId,
        week_key: weekKey,
        habit_name: habitData.habitName,
        days: habitData.days,
        reflection: habitData.reflection,
        weekly_score: calculateWeekScore(weekKey, habitData.days, habitData.habitName, userCreatedAt).totalWeekScore
      }, {
        onConflict: 'user_id,week_key'
      });

    if (error) {
      console.error('Error saving habit:', error);
      // Show specific error message if it's about habit change restriction
      if (error.code === '23514' && error.message.includes('Nie można zmienić nawyku')) {
        toast({
          title: "Ograniczenie zmiany nawyku",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się zapisać nawyku",
          variant: "destructive",
        });
      }
    } else {
      setIsHabitSaved(true);
      toast({
        title: "Sukces",
        description: "Nawyk został zapisany",
      });
    }
  };

  const handleChangeHabit = () => {
    setTempHabitName(habitData.habitName);
    setIsChangeDialogOpen(true);
    setConfirmationWord('');
  };

  const confirmChangeHabit = async () => {
    if (confirmationWord.toLowerCase() !== 'zmień') {
      toast({
        title: "Błąd",
        description: "Wpisz słowo 'zmień' aby potwierdzić",
        variant: "destructive",
      });
      return;
    }

    if (!tempHabitName.trim()) {
      toast({
        title: "Błąd",
        description: "Musisz wpisać nową nazwę nawyku",
        variant: "destructive",
      });
      return;
    }

    // Zerowanie danych tygodnia
    const resetData = {
      habitName: tempHabitName,
      days: new Array(7).fill(0),
      reflection: '',
      weeklyScore: 0
    };

    const { error } = await supabase
      .from('habits')
      .upsert({
        user_id: userId,
        week_key: weekKey,
        habit_name: resetData.habitName,
        days: resetData.days,
        reflection: resetData.reflection,
        weekly_score: resetData.weeklyScore
      }, {
        onConflict: 'user_id,week_key'
      });

    if (error) {
      console.error('Error changing habit:', error);
      // Show specific error message if it's about habit change restriction
      if (error.code === '23514' && error.message.includes('Nie można zmienić nawyku')) {
        toast({
          title: "Ograniczenie zmiany nawyku",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się zmienić nawyku",
          variant: "destructive",
        });
      }
    } else {
      setHabitData(resetData);
      setIsChangeDialogOpen(false);
      setConfirmationWord('');
      setTempHabitName('');
      toast({
        title: "Sukces",
        description: "Nawyk został zmieniony i dane wyzerowane",
      });
      onDataChange?.();
    }
  };

  const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  
  const { validDaysCount, completedDaysCount } = getProgressData();
  const completionPercentage = validDaysCount > 0 ? (completedDaysCount / validDaysCount) * 100 : 0;
  const weekScore = calculateWeekScore(weekKey, habitData.days, habitData.habitName, userCreatedAt);
  const currentWeeklyScore = weekScore.totalWeekScore;
  const dayPointsBreakdown = getDayPointsBreakdown();
  
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <div className="flex-1">
                {habitChangeBlocked ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        placeholder="Wpisz nawyk, nad którym chcesz pracować..."
                        value={habitData.habitName}
                        onChange={(e) => updateHabitName(e.target.value)}
                        className="modern-input text-base sm:text-lg py-3 px-4"
                        disabled={isHabitSaved || habitChangeBlocked}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="text-xs text-destructive">
                        {habitBlockReason}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Input
                    placeholder="Wpisz nawyk, nad którym chcesz pracować..."
                    value={habitData.habitName}
                    onChange={(e) => updateHabitName(e.target.value)}
                    className="modern-input text-base sm:text-lg py-3 px-4"
                    disabled={isHabitSaved || habitChangeBlocked}
                  />
                )}
              </div>
              {!isHabitSaved && (
                <Button
                  onClick={() => setShowHabitWheel(true)}
                  variant="outline"
                  size="sm"
                  disabled={habitChangeBlocked}
                  className="shrink-0"
                >
                  <Dice1 className="w-4 h-4" />
                  <span className="ml-1 hidden sm:inline">Losuj</span>
                </Button>
              )}
            </div>
            {!isHabitSaved ? (
              <Button
                onClick={handleSaveHabit}
                disabled={!habitData.habitName.trim() || habitChangeBlocked}
                className="px-6 w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Zapisz nawyk
              </Button>
            ) : (
              <div className="relative">
                {isMobile ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleChangeHabit}
                      variant="outline"
                      className={`px-6 w-full sm:w-auto ${habitChangeBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={habitChangeBlocked}
                      type="button"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Zmień nawyk
                    </Button>

                    {habitChangeBlocked && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Dlaczego zablokowane?"
                            className="shrink-0"
                          >
                            <Info className="w-5 h-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="end" className="max-w-xs p-3">
                          <div className="text-xs text-destructive">
                            {habitBlockReason}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={habitChangeBlocked ? undefined : handleChangeHabit}
                        variant="outline"
                        className={`px-6 w-full sm:w-auto ${habitChangeBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={habitChangeBlocked}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Zmień nawyk
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      {habitChangeBlocked ? (
                        <div className="text-xs text-destructive">
                          {habitBlockReason}
                        </div>
                      ) : (
                        <div className="text-xs">
                          Kliknij aby zmienić nawyk i wyzerować dane tego tygodnia
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          {!isHabitSaved && !isHabitDefined && (
            <p className="text-sm text-muted-foreground mt-2 animate-fade-in">
              Wpisz nazwę nawyku i kliknij "Zapisz nawyk" aby móc go śledzić
            </p>
          )}
          {isHabitSaved && (
            habitChangeBlocked ? (
              <p className="text-sm text-muted-foreground mt-2 animate-fade-in">
                Kontynuuj nawyk z poprzedniego tygodnia. {isMobile ? "Po więcej informacji najedź na ikonkę (i)." : "Po więcej informacji najedź na nawyk powyżej."}
              </p>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 animate-fade-in">
                Nawyk został zapisany. Użyj "Zmień nawyk" aby go edytować.
              </p>
            )
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
                  {completedDaysCount}/{validDaysCount} dni ({Math.round(completionPercentage)}%)
                </span>
                {isMobile ? (
                  <div className="relative">
                    <span 
                      className={`px-4 py-2 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-1 ${
                        currentWeeklyScore >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}
                      onClick={() => setShowMobileTooltip(!showMobileTooltip)}
                    >
                      {currentWeeklyScore >= 0 ? '+' : ''}{currentWeeklyScore} pkt
                      <Info className="w-3 h-3" />
                    </span>
                    {showMobileTooltip && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowMobileTooltip(false)}
                        />
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 bg-popover border border-border rounded-md shadow-lg p-3 max-w-xs">
                          <div className="text-xs space-y-1">
                            <div className="font-semibold mb-2">Szczegóły punktacji:</div>
                            {dayPointsBreakdown.map((day, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{format(day.date, 'EEE dd.MM', { locale: pl })}:</span>
                                <span className={day.points > 0 ? 'text-green-400' : day.points < 0 ? 'text-red-400' : 'text-gray-400'}>
                                  {day.points > 0 ? '+' : ''}{day.points}
                                </span>
                              </div>
                            ))}
                            {weekScore.perfectWeekBonus > 0 && (
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span>Bonus za idealny tydzień:</span>
                                <span className="text-green-400">+{weekScore.perfectWeekBonus}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`px-4 py-2 rounded-full font-semibold text-sm cursor-help flex items-center gap-1 ${
                        currentWeeklyScore >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {currentWeeklyScore >= 0 ? '+' : ''}{currentWeeklyScore} pkt
                        <Info className="w-3 h-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="text-xs space-y-1">
                        <div className="font-semibold mb-2">Szczegóły punktacji:</div>
                        {dayPointsBreakdown.map((day, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{format(day.date, 'EEE dd.MM', { locale: pl })}:</span>
                            <span className={day.points > 0 ? 'text-green-400' : day.points < 0 ? 'text-red-400' : 'text-gray-400'}>
                              {day.points > 0 ? '+' : ''}{day.points}
                            </span>
                          </div>
                        ))}
                        {weekScore.perfectWeekBonus > 0 && (
                          <div className="flex justify-between border-t pt-1 mt-1">
                            <span>Bonus za idealny tydzień:</span>
                            <span className="text-green-400">+{weekScore.perfectWeekBonus}</span>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
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
              today.setHours(23, 59, 59, 999); // Set to end of today for proper comparison
              const isPastOrToday = isBefore(dayDate, today) || isToday(dayDate);
              const isFutureDay = !isPastOrToday;
              const isValidDay = isDayValid(dayDate);
              const dayBreakdown = dayPointsBreakdown[index];
              
              return (
                <Tooltip key={day}>
                  <TooltipTrigger asChild>
                    <div 
                      className={`
                        flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 
                        transition-all duration-300 min-h-[70px] cursor-help
                        ${dayStatus === 1 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                          : dayStatus === 2
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                          : 'border-border hover:border-primary/50 hover:bg-accent/30'
                        }
                        ${!isHabitDefined ? 'opacity-50' : ''}
                        ${!isValidDay ? 'opacity-40 bg-muted/30' : ''}
                      `}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <Label className={`font-semibold text-sm sm:text-base ${
                          !isValidDay 
                            ? 'text-muted-foreground line-through'
                            : dayStatus === 1 
                            ? 'text-green-700 dark:text-green-300' 
                            : dayStatus === 2
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-foreground'
                        }`}>
                          {day}
                          {!isValidDay && (
                            <span className="text-xs ml-1 opacity-70">(nie liczony)</span>
                          )}
                        </Label>
                        <span className={`text-xs sm:text-sm font-medium truncate ${
                          !isValidDay 
                            ? 'text-muted-foreground opacity-70'
                            : dayStatus === 1 
                            ? 'text-green-600 dark:text-green-400' 
                            : dayStatus === 2
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                        }`}>
                          {format(dayDate, 'd MMMM', { locale: pl })}
                          {dayBreakdown.points !== 0 && (
                            <span className={`ml-1 text-xs ${
                              dayBreakdown.points > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              ({dayBreakdown.points > 0 ? '+' : ''}{dayBreakdown.points})
                            </span>
                          )}
                        </span>
                      </div>
                       
                      <div className="flex gap-2 ml-3">
                        <Button
                          variant={dayStatus === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDayStatus(index, dayStatus === 1 ? 0 : 1)}
                          className={`${dayStatus === 1 ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20'}`}
                          disabled={isFutureDay || !isHabitSaved || !isValidDay || weekKey < getISOWeekKey(new Date())}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant={dayStatus === 2 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDayStatus(index, dayStatus === 2 ? 0 : 2)}
                          className={`${dayStatus === 2 ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'}`}
                          disabled={isFutureDay || !isHabitSaved || !isValidDay || weekKey < getISOWeekKey(new Date())}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="text-xs">
                      <div className="font-semibold">{format(dayDate, 'EEEE, d MMMM', { locale: pl })}</div>
                      <div className="text-muted-foreground">{dayBreakdown.reason}</div>
                      {dayBreakdown.points !== 0 && (
                        <div className={dayBreakdown.points > 0 ? 'text-green-400' : 'text-red-400'}>
                          Punkty: {dayBreakdown.points > 0 ? '+' : ''}{dayBreakdown.points}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
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

      {/* Dialog potwierdzenia zmiany nawyku */}
      <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmiana nawyku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Zmiana nawyku spowoduje wyzerowanie wszystkich danych tego tygodnia (zaznaczone dni i refleksja).
            </p>
            <div>
              <Label htmlFor="new-habit">Nowa nazwa nawyku:</Label>
              <Input
                id="new-habit"
                value={tempHabitName}
                onChange={(e) => setTempHabitName(e.target.value)}
                placeholder="Wpisz nową nazwę nawyku..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmation">Wpisz słowo "zmień" aby potwierdzić:</Label>
              <Input
                id="confirmation"
                value={confirmationWord}
                onChange={(e) => setConfirmationWord(e.target.value)}
                placeholder="zmień"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangeDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              onClick={confirmChangeHabit}
              disabled={confirmationWord.toLowerCase() !== 'zmień' || !tempHabitName.trim()}
            >
              Zmień nawyk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HabitWheelDialog
        open={showHabitWheel}
        onOpenChange={setShowHabitWheel}
        onHabitSelected={handleHabitWheelSelection}
        userId={userId || ''}
      />
    </div>
  );
};