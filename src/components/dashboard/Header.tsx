import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
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
  const { monthlyScore, loading } = useMonthlyScore(user.id, selectedDate, refreshTrigger);
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
                <span className={`text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                  monthlyScore >= 0 
                    ? 'bg-points-positive-bg text-points-positive' 
                    : 'bg-points-negative-bg text-points-negative'
                }`}>
                  {loading ? '...' : `${monthlyScore >= 0 ? '+' : ''}${monthlyScore} pkt`}
                </span>
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