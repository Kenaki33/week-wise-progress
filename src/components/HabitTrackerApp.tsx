import React, { useState, useEffect } from 'react';
import { AuthPage } from './auth/AuthPage';
import { Dashboard } from './dashboard/Dashboard';

// Mock user state for demonstration
// This will be replaced with actual Supabase auth when integrated
interface User {
  id: string;
  email: string;
}

export const HabitTrackerApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking auth state
    // This will be replaced with Supabase auth state listener
    const checkAuth = () => {
      const savedUser = localStorage.getItem('demo-user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('demo-user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('demo-user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};