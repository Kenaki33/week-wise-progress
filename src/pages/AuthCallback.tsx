import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
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
            {status === 'success' && 'Konto aktywowane!'}
            {status === 'error' && 'Błąd aktywacji'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'loading' && (
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