import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Info } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserPanel } from './UserPanel';
import { User } from '@supabase/supabase-js';
import { useMonthlyScore } from '@/hooks/useMonthlyScore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  selectedDate?: Date;
  refreshTrigger?: number;
}

export const Header = ({ user, onLogout, selectedDate, refreshTrigger }: HeaderProps) => {
  const { monthlyScore, breakdown, loading } = useMonthlyScore(user.id, selectedDate, refreshTrigger);
  return (
    <header className="bg-header text-header-foreground shadow-lg">
      <div className="container mx-auto px-2 sm:px-6 py-2 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-2xl font-bold truncate leading-tight">Mój Tracker Nawyków</h1>
            {selectedDate && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                <span className="text-xs sm:text-sm text-header-foreground/70 truncate">
                  {format(selectedDate, 'LLLL yyyy', { locale: pl })}:
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded w-fit cursor-help flex items-center gap-1 ${
                      monthlyScore >= 0 
                        ? 'bg-points-positive-bg text-points-positive' 
                        : 'bg-points-negative-bg text-points-negative'
                    }`}>
                      {loading ? '...' : `${monthlyScore >= 0 ? '+' : ''}${monthlyScore} pkt`}
                      <Info className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    {breakdown ? (
                      <div className="text-xs space-y-1">
                        <div className="font-semibold mb-2">Szczegóły punktacji miesiąca:</div>
                        {breakdown.weeklyScores.length > 0 ? (
                          <>
                            {breakdown.weeklyScores.map((week, index) => (
                              <div key={index} className="flex justify-between">
                                <span>Tydzień {week.weekKey}:</span>
                                <span className={week.score > 0 ? 'text-green-400' : week.score < 0 ? 'text-red-400' : 'text-gray-400'}>
                                  {week.score > 0 ? '+' : ''}{week.score}
                                </span>
                              </div>
                            ))}
                            {breakdown.perfectWeekBonuses > 0 && (
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span>Bonusy za idealne tygodnie:</span>
                                <span className="text-green-400">+{breakdown.perfectWeekBonuses}</span>
                              </div>
                            )}
                            {breakdown.badgeRewards > 0 && (
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span>Odznaki (Mistrzowski Miesiąc):</span>
                                <span className="text-green-400">+{breakdown.badgeRewards}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-1 mt-1 font-semibold">
                              <span>RAZEM:</span>
                              <span className={breakdown.totalScore > 0 ? 'text-green-400' : breakdown.totalScore < 0 ? 'text-red-400' : 'text-gray-400'}>
                                {breakdown.totalScore > 0 ? '+' : ''}{breakdown.totalScore}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div>Brak tygodni w tym miesiącu</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs">Ładowanie danych miesiąca...</div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <ThemeToggle />
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <UserPanel user={user} />
              
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10 hidden sm:flex"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj
              </Button>
              
              {/* Mobile version - icon only */}
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10 sm:hidden p-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};