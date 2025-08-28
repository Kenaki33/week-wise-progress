import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { computeBadgeCounts, computeBadgeProgress, BadgeCounts, BadgeProgress } from '@/hooks/useBadges';
import { dedupeHabitsByWeek } from '@/utils/habitsDedup';
import { parseISO } from 'date-fns';

interface BadgesProps {
  userId: string;
}

export const Badges = ({ userId }: BadgesProps) => {
  const [badges, setBadges] = useState<BadgeCounts>({ masterWeek: 0, masterMonth: 0 });
  const [progress, setProgress] = useState<BadgeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    setLoading(true);
    
    try {
      // Fetch user's profile for created_at date
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fetch user's habits
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('week_key, days, habit_name, updated_at, created_at')
        .eq('user_id', userId);

      if (habitsError) throw habitsError;

      const userCreatedAt = profile?.created_at ? parseISO(profile.created_at) : null;
      const dedupedHabits = dedupeHabitsByWeek(habits || []);
      
      const badgeCounts = computeBadgeCounts(dedupedHabits, userCreatedAt);
      const badgeProgress = computeBadgeProgress(dedupedHabits, userCreatedAt);
      setBadges(badgeCounts);
      setProgress(badgeProgress);
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać odznak",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card hover-lift animate-fade-in">
        <CardContent className="pt-6">
          <div className="text-center">Ładowanie odznak...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card hover-lift animate-fade-in">
      <CardHeader>
        <CardTitle className="gradient-text">Twoje Odznaki</CardTitle>
      </CardHeader>
      <CardContent>
        {progress && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Postęp do następnej odznaki</span>
              <span className="text-sm text-muted-foreground">
                {progress.current}/{progress.needed}
              </span>
            </div>
            <Progress 
              value={(progress.current / progress.needed) * 100} 
              className="mb-2 progress-gradient"
            />
            <p className="text-xs text-muted-foreground">
              {progress.current} {progress.description}
            </p>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa odznaki</TableHead>
              <TableHead className="text-right">Ilość</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help font-medium">Mistrzowski Tydzień</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] break-words">
                      <p>Za osiągnięcie co najmniej 85% dni zaliczonych w jednym tygodniu.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-right font-semibold text-primary">
                {badges.masterWeek}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help font-medium">Mistrzowski Miesiąc</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] break-words">
                      <p>Za cztery tygodnie z rzędu, w których każdy ma wynik co najmniej 85%.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-right font-semibold text-primary">
                {badges.masterMonth}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};