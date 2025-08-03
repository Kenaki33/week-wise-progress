import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export const LoginForm = ({ onSwitchToRegister, onSwitchToReset }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Placeholder for Supabase integration
    toast({
      title: "Integracja wymagana",
      description: "Aby się zalogować, aktywuj integrację Supabase klikając zielony przycisk w prawym górnym rogu",
      variant: "destructive",
    });
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
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
      
      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Logowanie...' : 'Zaloguj się'}
      </Button>

      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={onSwitchToReset}
          className="text-sm text-primary hover:underline"
        >
          Zapomniałem hasła
        </button>
        
        <div className="text-sm text-muted-foreground">
          Nie masz konta?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-primary hover:underline font-medium"
          >
            Zarejestruj się
          </button>
        </div>
      </div>
    </form>
  );
};