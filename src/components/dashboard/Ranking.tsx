import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, RotateCcw } from 'lucide-react';
import { useUnifiedScoring } from '@/hooks/useUnifiedScoring';

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
  const [showMode, setShowMode] = useState<'top50' | 'showMe'>('top50');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { calculateUserScores } = useUnifiedScoring();

  useEffect(() => {
    fetchRanking();
  }, []);

  useEffect(() => {
    filterAndDisplayUsers();
  }, [users, selectedPersonality, showMode]);

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

      const usersWithScores = await calculateUserScores(profiles);
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

  const filterAndDisplayUsers = () => {
    // First filter by personality
    let personalityFiltered = users;
    if (selectedPersonality !== 'all') {
      personalityFiltered = users.filter(user => user.nutrition_personality === selectedPersonality);
    }

    // Then apply display logic based on mode
    let displayUsers = personalityFiltered;
    
    if (showMode === 'top50') {
      // Show only top 50
      displayUsers = personalityFiltered.slice(0, 50);
    } else if (showMode === 'showMe') {
      // Show current user (even if not in top 50)
      const currentUser = personalityFiltered.find(user => user.user_id === currentUserId);
      displayUsers = currentUser ? [currentUser] : [];
    }
    
    setFilteredUsers(displayUsers);
  };

  const handleShowMe = () => {
    setShowMode('showMe');
  };

  const handleBackToTop = () => {
    setShowMode('top50');
  };

  const getRealPosition = (userId: string) => {
    // Get real position in full ranking (filtered by personality if selected)
    let personalityFiltered = users;
    if (selectedPersonality !== 'all') {
      personalityFiltered = users.filter(user => user.nutrition_personality === selectedPersonality);
    }
    
    const userIndex = personalityFiltered.findIndex(user => user.user_id === userId);
    return userIndex >= 0 ? userIndex + 1 : -1;
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
    <Card className="glass-card hover-lift animate-fade-in">
        <CardContent className="pt-6">
          <div className="text-center">Ładowanie rankingu...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card hover-lift animate-fade-in">
      <CardHeader className="pb-3">
        <div>
          <div className="gradient-text text-lg sm:text-xl font-bold">
            Ranking użytkowników
            <span className="hidden sm:inline">
              {showMode === 'top50' && ` (Top 50)`}
              {showMode === 'showMe' && ` - Twoja pozycja`}
            </span>
          </div>
          {/* Mobile subtitle */}
          <div className="block sm:hidden text-sm text-muted-foreground mt-1">
            {showMode === 'top50' && `(Top 50)`}
            {showMode === 'showMe' && `Twoja pozycja`}
          </div>
        </div>
        
        {/* Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            {/* Personality filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <label htmlFor="personality-filter" className="text-xs sm:text-sm font-medium">
                Filtruj po osobowości:
              </label>
              <div className="flex gap-2">
                <Select value={selectedPersonality} onValueChange={setSelectedPersonality}>
                  <SelectTrigger className="flex-1 sm:w-64 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
                    {Object.entries(personalityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Action buttons - mobile: same line as filter */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowMe}
                  className="flex items-center gap-1 flex-shrink-0"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Znajdź mnie</span>
                </Button>
                {showMode !== 'top50' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToTop}
                    className="flex items-center gap-1 flex-shrink-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">Top 50</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-4 sm:py-8">
            <p className="text-muted-foreground text-sm">Brak użytkowników do wyświetlenia</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-full">
              {/* Mobile view - stacked cards */}
              <div className="block sm:hidden space-y-1.5">
                {filteredUsers.map((user, index) => (
                  <div 
                    key={user.user_id}
                    className={`p-2 rounded-lg border ${
                      isCurrentUser(user.user_id) ? 'bg-accent/50 border-primary/30' : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-bold text-primary flex-shrink-0">#{getRealPosition(user.user_id)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-xs truncate">
                            {user.nickname}
                            {isCurrentUser(user.user_id) && (
                              <span className="ml-1 text-[10px] text-primary">(Ty)</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {personalityLabels[user.nutrition_personality]}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 text-[10px] flex-shrink-0">
                        <div className="text-center">
                          <div className="text-muted-foreground">Miesiąc</div>
                          <div className={`font-semibold ${getScoreColor(user.monthly_score)}`}>
                            {user.monthly_score >= 0 ? '+' : ''}{user.monthly_score}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Łącznie</div>
                          <div className={`font-semibold ${getScoreColor(user.total_score)}`}>
                            {user.total_score >= 0 ? '+' : ''}{user.total_score}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop view - table */}
              <Table className="modern-table hidden sm:table">
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
                        {getRealPosition(user.user_id)}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};