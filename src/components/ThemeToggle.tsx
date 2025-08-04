import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10 p-2 min-w-[80px]"
      title="Zmień motyw"
    >
      <div className="flex items-center space-x-2">
        {isDark ? (
          <>
            <Moon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Noc</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Dzień</span>
          </>
        )}
      </div>
    </Button>
  );
};