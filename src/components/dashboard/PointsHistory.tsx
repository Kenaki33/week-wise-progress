import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfMonth, endOfMonth, addDays, startOfWeek, isBefore, isToday, isWithinInterval, parseISO, isAfter, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface PointsHistoryProps {
  userId: string;
}

interface MonthlyPoints {
  month: string;
  year: number;
  points: number;
  displayName: string;
}

export const PointsHistory = ({ userId }: PointsHistoryProps) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPointsHistory();
  }, [userId]);

  const fetchPointsHistory = async () => {
    setLoading(true);
    
    try {
      // Get user creation date from profiles (same source as Ranking and useMonthlyScore)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', userId)
        .single();
      
      if (profileError || !profile?.created_at) {
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać daty utworzenia konta",
          variant: "destructive",
        });
        return;
      }
      
      const createdAt = parseISO(profile.created_at);
      setUserCreatedAt(createdAt);
      
      // Get all habit data for the user
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('week_key, days, habit_name')
        .eq('user_id', userId);

      if (habitsError) {
        console.error('Error fetching habits:', habitsError);
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać danych nawyków",
          variant: "destructive",
        });
        return;
      }

      // Calculate points for each month from account creation
      const monthlyPoints: { [key: string]: MonthlyPoints } = {};
      const now = new Date();
      const accountStartMonth = startOfMonth(createdAt);
      
      // Initialize all months from account creation to current month
      let currentMonth = new Date(accountStartMonth);
      while (!isAfter(currentMonth, now)) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        monthlyPoints[monthKey] = {
          month: monthKey,
          year: currentMonth.getFullYear(),
          points: 0,
          displayName: format(currentMonth, 'LLLL yyyy', { locale: pl })
        };
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }

      // Use the unified scoring system
      const { calculateMonthlyScores } = await import('@/hooks/useScoring');
      const monthlyScores = calculateMonthlyScores(habitsData || [], createdAt);
      
      // Update monthlyPoints with calculated scores
      Object.entries(monthlyScores).forEach(([monthKey, scoreData]) => {
        if (monthlyPoints[monthKey]) {
          monthlyPoints[monthKey].points = scoreData.points;
        }
      });

      // Convert to array and sort by date (newest first)
      const sortedData = Object.values(monthlyPoints)
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
      
      setMonthlyData(sortedData);
      
    } catch (error) {
      console.error('Error in fetchPointsHistory:', error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas pobierania historii punktów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPointsColor = (points: number) => {
    if (points > 0) return 'text-green-600 dark:text-green-400';
    if (points < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getPointsDisplay = (points: number) => {
    return `${points >= 0 ? '+' : ''}${points} pkt`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historia punktacji</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Ładowanie...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historia punktacji</CardTitle>
        {userCreatedAt && (
          <p className="text-sm text-muted-foreground">
            Konto utworzone: {format(userCreatedAt, 'd MMMM yyyy', { locale: pl })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {monthlyData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak danych do wyświetlenia
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Miesiąc</TableHead>
                <TableHead className="text-right">Punkty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((monthData) => (
                <TableRow key={monthData.month}>
                  <TableCell className="font-medium">
                    {monthData.displayName}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${getPointsColor(monthData.points)}`}>
                    {getPointsDisplay(monthData.points)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};