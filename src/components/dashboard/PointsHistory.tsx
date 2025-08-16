import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedScoring } from '@/hooks/useUnifiedScoring';

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
  const { calculateAllMonthlyScores } = useUnifiedScoring();

  useEffect(() => {
    fetchPointsHistory();
  }, [userId]);

  const fetchPointsHistory = async () => {
    setLoading(true);
    
    try {
      const scores = await calculateAllMonthlyScores(userId);
      
      // Format display names with Polish locale
      const formattedScores = scores.map(score => ({
        ...score,
        displayName: format(new Date(score.month), 'LLLL yyyy', { locale: pl })
      }));
      
      setMonthlyData(formattedScores);
      
      // Set user creation date for display purposes
      if (formattedScores.length > 0) {
        const oldestMonth = formattedScores[formattedScores.length - 1];
        setUserCreatedAt(new Date(oldestMonth.month));
      }
      
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