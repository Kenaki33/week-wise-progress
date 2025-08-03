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
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mój Tracker Nawyków</h1>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onChangePassword}
                className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10"
              >
                <Key className="w-4 h-4 mr-2" />
                Zmień hasło
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};