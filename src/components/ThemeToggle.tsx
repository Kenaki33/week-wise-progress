import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

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
    <div className="theme-switch-wrapper">
      <label className="theme-switch" htmlFor="theme-checkbox" title="Zmień motyw">
        <input 
          type="checkbox" 
          id="theme-checkbox" 
          checked={isDark}
          onChange={toggleTheme}
        />
        <div className="theme-slider">
          <div className="theme-icon sun-icon">
            <Sun size={16} />
          </div>
          <div className="theme-icon moon-icon">
            <Moon size={16} />
          </div>
        </div>
      </label>
    </div>
  );
};