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
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Mój Tracker Nawyków</h1>
            {selectedDate && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-header-foreground/70">
                  {format(selectedDate, 'LLLL yyyy', { locale: pl })}:
                </span>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${
                  monthlyScore >= 0 
                    ? 'bg-green-500/20 text-green-100' 
                    : 'bg-red-500/20 text-red-100'
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