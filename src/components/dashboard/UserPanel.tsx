import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Settings } from 'lucide-react';

interface UserPanelProps {
  user: User;
}

type NutritionPersonality = 'ekspresowy_konsument' | 'emocjonalny_podjadacz' | 'beztroski_lasuch' | 'nieswiadomy_zjadacz' | 'perfekcjonista_dietetyczny' | 'wieczny_odchudzacz' | 'ogarniety_odzywiacze';

interface UserProfile {
  nickname: string;
  nutrition_personality: NutritionPersonality;
}

const personalityLabels = {
  'ekspresowy_konsument': 'Ekspresowy Konsument',
  'emocjonalny_podjadacz': 'Emocjonalny Podjadacz',
  'beztroski_lasuch': 'Beztroski Łasuch',
  'nieswiadomy_zjadacz': 'Nieświadomy Zjadacz',
  'perfekcjonista_dietetyczny': 'Perfekcjonista Dietetyczny',
  'wieczny_odchudzacz': 'Wieczny Odchudzacz',
  'ogarniety_odzywiacze': 'Ogarnięty Odżywiacz'
};

export const UserPanel = ({ user }: UserPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [newPersonality, setNewPersonality] = useState<NutritionPersonality>('ekspresowy_konsument');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname, nutrition_personality')
      .eq('user_id', user.id)
      .single();

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać danych profilu",
        variant: "destructive",
      });
    } else {
      setProfile(data);
      setNewPersonality(data.nutrition_personality);
    }
  };

  const updatePersonality = async () => {
    if (!newPersonality || !profile) return;

    setLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ nutrition_personality: newPersonality })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować osobowości żywieniowej",
        variant: "destructive",
      });
    } else {
      setProfile({ ...profile, nutrition_personality: newPersonality });
      toast({
        title: "Sukces",
        description: "Osobowość żywieniowa została zaktualizowana",
      });
    }
    
    setLoading(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Błąd",
        description: "Nowe hasła nie są identyczne",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Błąd",
        description: "Nowe hasło musi mieć co najmniej 6 znaków",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

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
        description: "Hasło zostało zmienione",
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Panel Użytkownika
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Panel Użytkownika</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="password">Zmiana hasła</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informacje o profilu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nick</Label>
                  <Input value={profile?.nickname || ''} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label>Adres email</Label>
                  <Input value={user.email || ''} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label>Osobowość żywieniowa</Label>
                  <Select value={newPersonality} onValueChange={(value) => setNewPersonality(value as NutritionPersonality)}>
                    <SelectTrigger>
                      <SelectValue />
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
                
                <Button 
                  onClick={updatePersonality} 
                  disabled={loading || newPersonality === profile?.nutrition_personality}
                  className="w-full"
                >
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Zmiana hasła</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Aktualne hasło</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nowe hasło</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                
                <Button 
                  onClick={changePassword} 
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {loading ? 'Zmienianie...' : 'Zmień hasło'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};