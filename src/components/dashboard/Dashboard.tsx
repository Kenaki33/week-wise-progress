import React, { useState } from 'react';
import { Header } from './Header';
import { WeekSelector } from './WeekSelector';
import { HabitTracker } from './HabitTracker';
import { ChangePasswordModal } from './ChangePasswordModal';
import { format } from 'date-fns';

interface DashboardProps {
  user?: any; // Will be typed properly when Supabase is connected
  onLogout: () => void;
}

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Generate week key for data storage (format: YYYY-WW)
  const getWeekKey = (date: Date) => {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const weekNumber = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  };

  const weekKey = getWeekKey(selectedDate);

  const handleLogout = () => {
    // Placeholder for Supabase logout
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Week Navigation */}
          <div className="flex justify-center px-4 sm:px-0">
            <WeekSelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          {/* Habit Tracker */}
          <HabitTracker
            weekKey={weekKey}
            selectedDate={selectedDate}
            userId={user?.id || 'demo-user'}
          />
        </div>
      </main>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};