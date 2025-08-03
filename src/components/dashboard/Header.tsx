import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Key } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  onChangePassword: () => void;
  onLogout: () => void;
}

export const Header = ({ onChangePassword, onLogout }: HeaderProps) => {
  return (
    <header className="bg-header text-header-foreground shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Mój Tracker Nawyków</h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <ThemeToggle />
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onChangePassword}
                className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10 hidden sm:flex"
              >
                <Key className="w-4 h-4 mr-2" />
                Zmień hasło
              </Button>
              
              {/* Mobile version - icon only */}
              <Button
                variant="outline"
                size="sm"
                onClick={onChangePassword}
                className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10 sm:hidden p-2"
              >
                <Key className="w-4 h-4" />
              </Button>
              
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