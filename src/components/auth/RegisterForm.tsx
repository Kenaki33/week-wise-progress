import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nutritionPersonality, setNutritionPersonality] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateNickname = (nickname: string): string | null => {
    if (nickname.length < 3 || nickname.length > 20) {
      return "Nick musi mieć od 3 do 20 znaków";
    }
    
    if (!/^[A-Z]/.test(nickname)) {
      return "Nick musi zaczynać się z wielkiej litery";
    }
    
    const profanityWords = ['kurwa', 'chuj', 'dupa', 'dziwka', 'sukinsyn', 'pierdol', 'jebac', 'zajebis', 'skurwysyn'];
    const lowerNickname = nickname.toLowerCase();
    
    for (const word of profanityWords) {
      if (lowerNickname.includes(word)) {
        return "Nick nie może zawierać wulgarnych słów";
      }
    }
    
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Błąd",
        description: "Hasła nie są identyczne",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Błąd",
        description: "Hasło musi mieć co najmniej 6 znaków",
        variant: "destructive",
      });
      return;
    }

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      toast({
        title: "Błąd",
        description: nicknameError,
        variant: "destructive",
      });
      return;
    }

    if (!nutritionPersonality) {
      toast({
        title: "Błąd",
        description: "Wybierz swoją osobowość żywieniową",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nutrition_personality: nutritionPersonality,
          nickname: nickname
        }
      }
    });

    if (error) {
      toast({
        title: "Błąd rejestracji",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sprawdź email",
        description: "Wysłaliśmy link aktywacyjny na Twój adres email",
      });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
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
        <Label htmlFor="nickname">Nick</Label>
        <Input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          placeholder="TwójNick"
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nutritionPersonality">Osobowość żywieniowa</Label>
        <Select value={nutritionPersonality} onValueChange={setNutritionPersonality}>
          <SelectTrigger>
            <SelectValue placeholder="Wybierz swoją osobowość żywieniową" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ekspresowy_konsument">Ekspresowy Konsument</SelectItem>
            <SelectItem value="emocjonalny_podjadacz">Emocjonalny Podjadacz</SelectItem>
            <SelectItem value="beztroski_lasuch">Beztroski Łasuch</SelectItem>
            <SelectItem value="nieswiadomy_zjadacz">Nieświadomy Zjadacz</SelectItem>
            <SelectItem value="perfekcjonista_dietetyczny">Perfekcjonista Dietetyczny</SelectItem>
            <SelectItem value="wieczny_odchudzacz">Wieczny Odchudzacz</SelectItem>
            <SelectItem value="ogarniety_odzywiacze">Ogarnięty Odżywiacz</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
      </Button>

      <div className="text-center">
        <div className="text-sm text-muted-foreground">
          Masz już konto?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary hover:underline font-medium"
          >
            Zaloguj się
          </button>
        </div>
      </div>
    </form>
  );
};