import React, { useState, useEffect } from 'react';
import { AuthPage } from './auth/AuthPage';
import { Dashboard } from './dashboard/Dashboard';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export const HabitTrackerApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user came from password reset link
  const urlParams = new URLSearchParams(window.location.search);
  const forceReset = urlParams.get('force_reset') === 'true';

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

  // Force password reset flow if coming from reset email
  if (forceReset) {
    window.history.replaceState({}, '', '/auth/callback' + window.location.search);
    window.location.reload();
    return null;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};