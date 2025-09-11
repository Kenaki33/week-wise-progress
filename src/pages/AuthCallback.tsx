import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'reset-password'>('loading');
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if this is a password recovery flow
        const type = searchParams.get('type');
        
        if (type === 'recovery') {
          setStatus('reset-password');
          setMessage('Wprowadź nowe hasło dla swojego konta.');
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Wystąpił błąd podczas aktywacji konta. Spróbuj zalogować się ponownie.');
          return;
        }

        // Check if there's an access_token or session
        if (data.session) {
          setStatus('success');
          setMessage('Konto zostało pomyślnie aktywowane! Za chwilę zostaniesz przekierowany do aplikacji.');
          
          // Redirect to main app after 2 seconds
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          // Check for error parameters in URL
          const error = searchParams.get('error');
          const errorDescription = searchParams.get('error_description');
          
          if (error) {
            setStatus('error');
            if (error === 'access_denied') {
              setMessage('Link aktywacyjny wygasł lub jest nieprawidłowy. Spróbuj zalogować się ponownie.');
            } else {
              setMessage(errorDescription || 'Wystąpił nieznany błąd podczas aktywacji konta.');
            }
          } else {
            setStatus('success');
            setMessage('Konto zostało aktywowane! Możesz się teraz zalogować.');
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        setMessage('Wystąpił nieoczekiwany błąd. Spróbuj zalogować się ponownie.');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  const handleContinue = () => {
    navigate('/', { replace: true });
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Błąd",
        description: "Hasła nie są identyczne",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Błąd", 
        description: "Hasło musi mieć co najmniej 6 znaków",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
      setIsResetting(false);
    } else {
      setStatus('success');
      setMessage('Hasło zostało pomyślnie zmienione! Za chwilę zostaniesz przekierowany do aplikacji.');
      
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <Loader className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Aktywacja konta...'}
            {status === 'success' && 'Sukces!'}
            {status === 'error' && 'Błąd'}
            {status === 'reset-password' && 'Ustaw nowe hasło'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'reset-password' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nowe hasło</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Wprowadź nowe hasło"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Potwierdź nowe hasło"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? 'Zmienianie hasła...' : 'Zmień hasło'}
              </Button>
            </form>
          )}
          
          {status !== 'loading' && status !== 'reset-password' && (
            <Button 
              onClick={handleContinue} 
              className="w-full"
              variant={status === 'error' ? 'outline' : 'default'}
            >
              {status === 'success' ? 'Przejdź do aplikacji' : 'Wróć do logowania'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;