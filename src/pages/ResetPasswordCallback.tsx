import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ResetPasswordCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setStatus('error');
          setMessage('Nieprawidłowy lub wygasły link resetowania hasła.');
          return;
        }

        if (!data.session) {
          setStatus('error');
          setMessage('Sesja nie została znaleziona. Link może być nieprawidłowy lub wygasły.');
          return;
        }

        setStatus('success');
        setMessage('Link jest prawidłowy. Wprowadź nowe hasło.');
      } catch (error) {
        console.error('Error during password reset callback:', error);
        setStatus('error');
        setMessage('Wystąpił błąd podczas weryfikacji linku.');
      }
    };

    handlePasswordReset();
  }, [searchParams]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Błąd",
        description: "Hasła się nie zgadzają.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Błąd",
        description: "Hasło musi mieć co najmniej 6 znaków.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Błąd",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sukces",
          description: "Hasło zostało zmienione pomyślnie!",
          variant: "default",
        });
        
        // Redirect to main page after successful password reset
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas zmiany hasła.",
        variant: "destructive",
      });
    }

    setUpdating(false);
  };

  const handleBackToLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader className="h-12 w-12 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-success" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Weryfikacja linku...'}
            {status === 'success' && 'Ustaw nowe hasło'}
            {status === 'error' && 'Błąd resetowania hasła'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nowe hasło</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Wprowadź nowe hasło"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Potwierdź hasło</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Potwierdź nowe hasło"
                />
              </div>

              <Button type="submit" className="w-full" disabled={updating}>
                {updating ? 'Zmienianie...' : 'Zmień hasło'}
              </Button>
            </form>
          )}
          
          {status === 'error' && (
            <Button onClick={handleBackToLogin} className="w-full">
              Powrót do strony głównej
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordCallback;