import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMonthlyScore } from '@/hooks/useMonthlyScore';
import { useTotalScore } from '@/hooks/useTotalScore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

// Komponent do obliczania punktów dla pojedynczego użytkownika
const UserScores = ({ userId, onScoreUpdate }: { 
  userId: string; 
  onScoreUpdate: (userId: string, monthlyScore: number, totalScore: number) => void;
}) => {
  const currentDate = new Date();
  const { monthlyScore, loading: monthlyLoading } = useMonthlyScore(userId, currentDate);
  const { totalScore, loading: totalLoading } = useTotalScore(userId);

  useEffect(() => {
    if (!monthlyLoading && !totalLoading) {
      onScoreUpdate(userId, monthlyScore, totalScore);
    }
  }, [userId, monthlyScore, totalScore, monthlyLoading, totalLoading, onScoreUpdate]);

  return null;
};

export const Ranking = ({ currentUserId }: RankingProps) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [users, setUsers] = useState<RankingUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<RankingUser[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [scoresLoaded, setScoresLoaded] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, selectedPersonality]);

  const fetchProfiles = async () => {
    setLoading(true);
    
    try {
      // Pobierz wszystkie profile użytkowników
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nickname, nutrition_personality, created_at');

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setProfiles(profilesData);
      
      // Inicjalizuj users z podstawowymi danymi
      const initialUsers = profilesData.map(profile => ({
        user_id: profile.user_id,
        nickname: profile.nickname,
        nutrition_personality: profile.nutrition_personality,
        monthly_score: 0,
        total_score: 0,
        created_at: profile.created_at
      }));
      
      setUsers(initialUsers);
      setScoresLoaded(new Set());
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać rankingu",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleScoreUpdate = (userId: string, monthlyScore: number, totalScore: number) => {
    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user => 
        user.user_id === userId 
          ? { ...user, monthly_score: monthlyScore, total_score: totalScore }
          : user
      );
      
      // Sortuj według punktów miesięcznych (malejąco)
      return updatedUsers.sort((a, b) => b.monthly_score - a.monthly_score);
    });
    
    setScoresLoaded(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      
      // Sprawdź czy wszystkie punkty zostały załadowane
      if (newSet.size === profiles.length) {
        setLoading(false);
      }
      
      return newSet;
    });
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
    <>
      {/* Ukryte komponenty do obliczania punktów */}
      {profiles.map(profile => (
        <UserScores 
          key={profile.user_id} 
          userId={profile.user_id} 
          onScoreUpdate={handleScoreUpdate}
        />
      ))}
      
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
    </>
  );
};