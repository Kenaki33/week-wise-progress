import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResetPasswordFormProps {
  onSwitchToLogin: () => void;
}

export const ResetPasswordForm = ({ onSwitchToLogin }: ResetPasswordFormProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback/reset-password`,
    });

    if (error) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSent(true);
    }
    
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-success text-4xl mb-4">✓</div>
        <h3 className="text-lg font-semibold">Email wysłany!</h3>
        <p className="text-muted-foreground text-sm">
          Sprawdź swoją skrzynkę pocztową i kliknij link aby zresetować hasło.
        </p>
        <Button onClick={onSwitchToLogin} variant="outline" className="w-full">
          Powrót do logowania
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-6">
      <div className="text-center text-sm text-muted-foreground mb-4">
        Wpisz swój adres email, a wyślemy Ci link do resetowania hasła.
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="twoj@email.com"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm text-primary hover:underline"
        >
          Powrót do logowania
        </button>
      </div>
    </form>
  );
};