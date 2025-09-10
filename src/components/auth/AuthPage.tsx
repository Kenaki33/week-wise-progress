import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';

type AuthMode = 'login' | 'register' | 'reset';

export const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Jeden Nawyk';
      case 'register':
        return 'Utwórz konto';
      case 'reset':
        return 'Resetuj hasło';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login':
        return 'Zaloguj się aby śledzić swoje nawyki';
      case 'register':
        return 'Dołącz do nas i zacznij budować lepsze nawyki';
      case 'reset':
        return 'Odzyskaj dostęp do swojego konta';
    }
  };

  return (
    <AuthLayout title={getTitle()} subtitle={getSubtitle()}>
      {mode === 'login' && (
        <LoginForm
          onSwitchToRegister={() => setMode('register')}
          onSwitchToReset={() => setMode('reset')}
        />
      )}
      {mode === 'register' && (
        <RegisterForm onSwitchToLogin={() => setMode('login')} />
      )}
      {mode === 'reset' && (
        <ResetPasswordForm onSwitchToLogin={() => setMode('login')} />
      )}
    </AuthLayout>
  );
};