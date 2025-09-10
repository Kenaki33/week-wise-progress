import React, { useState } from 'react';
import { Header } from './Header';
import { WeekSelector } from './WeekSelector';
import { HabitTracker } from './HabitTracker';
import { format } from 'date-fns';
import { User } from '@supabase/supabase-js';
import { getISOWeekKey } from '@/utils/weekKey';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Generate week key (ISO: RRRR-II)
  const getWeekKey = (date: Date) => getISOWeekKey(date);

  const weekKey = getWeekKey(selectedDate);

  const handleLogout = () => {
    // Placeholder for Supabase logout
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background page-transition">
      <Header
        user={user}
        onLogout={handleLogout}
        selectedDate={selectedDate}
        refreshTrigger={refreshTrigger}
      />
      
      <main className="container mx-auto px-2 sm:px-6 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Week Navigation */}
          <div className="px-1 sm:px-0">
            <WeekSelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              userId={user?.id || 'demo-user'}
            />
          </div>

          {/* Habit Tracker */}
          <HabitTracker
            weekKey={weekKey}
            selectedDate={selectedDate}
            userId={user?.id || 'demo-user'}
            onDataChange={() => setRefreshTrigger(prev => prev + 1)}
          />
        </div>
      </main>

      {/* Facebook Group Button */}
      <div className="bg-card border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex justify-center">
            <a
              href="https://www.facebook.com/groups/188340450824129"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-facebook inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-white no-underline hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Dołącz do naszej społeczności na Facebooku
            </a>
          </div>
          
          {/* Legal Links */}
          <div className="flex justify-center mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a 
                href="/terms-of-service.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Regulamin
              </a>
              <span>•</span>
              <a 
                href="/privacy-policy.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Polityka Prywatności
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};