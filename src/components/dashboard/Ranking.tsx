import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfWeek, addDays, isBefore, isToday, parseISO, startOfDay } from 'date-fns';

type NutritionPersonality = 'ekspresowy_konsument' | 'emocjonalny_podjadacz' | 'beztroski_lasuch' | 'nieswiadomy_zjadacz' | 'perfekcjonista_dietetyczny' | 'wieczny_odchudzacz' | 'ogarniety_odzywiacze';

interface RankingUser {
  user_id: string;
  nickname: string;
  nutrition_personality: NutritionPersonality;
  monthly_score: number;
  total_score: number;
  created_at: string;
}

const personalityLabels = {
  'ekspresowy_konsument': 'Ekspresowy Konsument',
  'emocjonalny_podjadacz': 'Emocjonalny Podjadacz',
  'beztroski_lasuch': 'Beztroski Łasuch',
  'nieswiadomy_zjadacz': 'Nieświadomy Zjadacz',
  'perfekcjonista_dietetyczny': 'Perfekcjonista Dietetyczny',
  'wieczny_odchudzacz': 'Wieczny Odchudzacz',
  'ogarniety_odzywiacze': 'Ogarnięty Odżywiacz'
};

interface RankingProps {
  currentUserId: string;
}

export const Ranking = ({ currentUserId }: RankingProps) => {
  const [users, setUsers] = useState<RankingUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<RankingUser[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRanking();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, selectedPersonality]);

  const fetchRanking = async () => {
    setLoading(true);
    
    try {
      // Pobierz wszystkie profile użytkowników
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nickname, nutrition_personality, created_at');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Pobierz wszystkie habits dla wszystkich użytkowników
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('user_id, days, week_key, habit_name');

      if (habitsError) throw habitsError;

      // Oblicz punkty dla każdego użytkownika - użyj DOKŁADNIE tej samej logiki co useMonthlyScore
      const currentDate = new Date();
      const currentMonth = format(currentDate, 'yyyy-MM');

      const usersWithScores = profiles.map(profile => {
        const userHabits = habits?.filter(habit => habit.user_id === profile.user_id) || [];
        
        let monthlyScore = 0;
        let totalScore = 0;
        
        const userCreatedAt = parseISO(profile.created_at);

        userHabits.forEach(habit => {
          if (habit.days && Array.isArray(habit.days)) {
            // Parse week_key to get the week start date (format: YYYY-WW)
            const [year, week] = habit.week_key.split('-');
            const yearStart = new Date(parseInt(year), 0, 1);
            const weekStartDate = startOfWeek(addDays(yearStart, (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
            
            // Check each day of the week
            habit.days.forEach((status: number, dayIndex: number) => {
              const dayDate = addDays(weekStartDate, dayIndex);
              const dayMonth = format(dayDate, 'yyyy-MM');
              
              // MONTHLY SCORE: Only count days that are within the CURRENT MONTH AND from account creation date onwards
              if (dayMonth === currentMonth && 
                  !isBefore(dayDate, startOfDay(userCreatedAt))) {
                
                // Only calculate points if habit name is defined (not empty)
                if (habit.habit_name && habit.habit_name.trim()) {
                  if (status === 1) {
                    // Completed task: +10 points
                    monthlyScore += 10;
                  } else if (status === 2) {
                    // Not completed task: -10 points
                    monthlyScore -= 10;
                  } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
                    // Unmarked past day: -15 points (only if habit is defined)
                    monthlyScore -= 15;
                  }
                }
              }
              
              // TOTAL SCORE: Count ALL days from account creation date onwards
              if (!isBefore(dayDate, startOfDay(userCreatedAt))) {
                // Only calculate points if habit name is defined (not empty)
                if (habit.habit_name && habit.habit_name.trim()) {
                  if (status === 1) {
                    // Completed task: +10 points
                    totalScore += 10;
                  } else if (status === 2) {
                    // Not completed task: -10 points
                    totalScore -= 10;
                  } else if (status === 0 && (isBefore(dayDate, new Date()) || isToday(dayDate))) {
                    // Unmarked past day: -15 points (only if habit is defined)
                    totalScore -= 15;
                  }
                }
              }
            });
          }
        });

        return {
          user_id: profile.user_id,
          nickname: profile.nickname,
          nutrition_personality: profile.nutrition_personality,
          monthly_score: monthlyScore,
          total_score: totalScore,
          created_at: profile.created_at
        };
      });

      // Sortuj według punktów miesięcznych (malejąco)
      usersWithScores.sort((a, b) => b.monthly_score - a.monthly_score);
      
      setUsers(usersWithScores);
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać rankingu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (selectedPersonality === 'all') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => user.nutrition_personality === selectedPersonality);
      setFilteredUsers(filtered);
    }
  };

  const getPositionDisplay = (index: number) => {
    return index + 1;
  };

  const getScoreColor = (score: number) => {
    if (score > 0) return 'text-points-positive';
    if (score < 0) return 'text-points-negative';
    return 'text-muted-foreground';
  };

  const isCurrentUser = (userId: string) => {
    return userId === currentUserId;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Ładowanie rankingu...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking użytkowników</CardTitle>
        <div className="flex items-center gap-2">
          <label htmlFor="personality-filter" className="text-sm font-medium">
            Filtruj po osobowości:
          </label>
          <Select value={selectedPersonality} onValueChange={setSelectedPersonality}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
              {Object.entries(personalityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Brak użytkowników do wyświetlenia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Miejsce</TableHead>
                  <TableHead>Nick</TableHead>
                  <TableHead className="text-right">Punkty w tym miesiącu</TableHead>
                  <TableHead className="text-right">Łączne punkty</TableHead>
                  <TableHead>Osobowość żywieniowa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow 
                    key={user.user_id}
                    className={isCurrentUser(user.user_id) ? 'bg-accent/50' : ''}
                  >
                    <TableCell className="font-medium">
                      {getPositionDisplay(index)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.nickname}
                      {isCurrentUser(user.user_id) && (
                        <span className="ml-2 text-xs text-primary">(Ty)</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getScoreColor(user.monthly_score)}`}>
                      {user.monthly_score >= 0 ? '+' : ''}{user.monthly_score}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getScoreColor(user.total_score)}`}>
                      {user.total_score >= 0 ? '+' : ''}{user.total_score}
                    </TableCell>
                    <TableCell className="text-sm">
                      {personalityLabels[user.nutrition_personality]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};