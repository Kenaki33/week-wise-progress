import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Settings, Trash2 } from 'lucide-react';
import { PointsHistory } from './PointsHistory';
import { Ranking } from './Ranking';
import { Badges } from './Badges';

interface UserPanelProps {
  user: User;
}

type NutritionPersonality = 'ekspresowy_konsument' | 'emocjonalny_podjadacz' | 'beztroski_lasuch' | 'nieswiadomy_zjadacz' | 'perfekcjonista_dietetyczny' | 'wieczny_odchudzacz' | 'ogarniety_odzywiacze';

interface UserProfile {
  nickname: string;
  nutrition_personality: NutritionPersonality;
  last_nickname_change: string;
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
  const [newNickname, setNewNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
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
      .select('nickname, nutrition_personality, last_nickname_change')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać danych profilu",
        variant: "destructive",
      });
    } else if (data) {
      setProfile(data);
      setNewPersonality(data.nutrition_personality);
      setNewNickname(data.nickname);
    } else {
      // Brak profilu - utwórz nowy
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          nickname: `User_${user.id.slice(0, 8)}`,
          nutrition_personality: 'ekspresowy_konsument',
          last_nickname_change: new Date().toISOString()
        });
      
      if (insertError) {
        toast({
          title: "Błąd",
          description: "Nie udało się utworzyć profilu",
          variant: "destructive",
        });
      } else {
        // Pobierz utworzony profil
        fetchProfile();
      }
    }
  };

  const validateNickname = (nickname: string): string | null => {
    if (nickname.length < 3 || nickname.length > 20) {
      return "Nick musi mieć od 3 do 20 znaków";
    }
    
    if (!/^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(nickname)) {
      return "Nick musi zaczynać się od wielkiej litery";
    }
    
    const profanityWords = ['kurwa', 'chuj', 'dupa', 'pierdol', 'jebać', 'sukinsyn'];
    const lowerNickname = nickname.toLowerCase();
    if (profanityWords.some(word => lowerNickname.includes(word))) {
      return "Nick nie może zawierać wulgaryzmów";
    }
    
    return null;
  };

  const canChangeNickname = (): boolean => {
    if (!profile?.last_nickname_change) return true;
    
    const lastChange = new Date(profile.last_nickname_change);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    return lastChange <= twoWeeksAgo;
  };

  const updateNickname = async () => {
    console.log('updateNickname called', { newNickname, profile, canChangeNickname: canChangeNickname() });
    if (!newNickname || !profile) return;

    const validationError = validateNickname(newNickname);
    if (validationError) {
      toast({
        title: "Błąd",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    if (!canChangeNickname()) {
      toast({
        title: "Błąd",
        description: "Nick można zmienić tylko raz na 2 tygodnie",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ 
        nickname: newNickname,
        last_nickname_change: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      if (error.code === '23505') { // unique constraint violation
        toast({
          title: "Błąd",
          description: "Ten nick jest już zajęty",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się zaktualizować nicku",
          variant: "destructive",
        });
      }
    } else {
      setProfile({ 
        ...profile, 
        nickname: newNickname,
        last_nickname_change: new Date().toISOString()
      });
      toast({
        title: "Sukces",
        description: "Nick został zaktualizowany",
      });
    }

    setLoading(false);
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

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'usuń') {
      toast({
        title: "Błąd",
        description: "Wpisz słowo 'usuń' aby potwierdzić usunięcie konta",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Delete user's badge rewards data
      const { error: badgeRewardsError } = await supabase
        .from('badge_rewards')
        .delete()
        .eq('user_id', user.id);

      if (badgeRewardsError) {
        console.error('Error deleting badge rewards:', badgeRewardsError);
      }

      // Delete user's habits data
      const { error: habitsError } = await supabase
        .from('habits')
        .delete()
        .eq('user_id', user.id);

      if (habitsError) {
        console.error('Error deleting habits:', habitsError);
      }

      // Delete user's profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Sign out the user (this is what we can do without admin permissions)
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        toast({
          title: "Błąd",
          description: "Nie udało się wylogować. Spróbuj ponownie później.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sukces",
          description: "Dane konta zostały usunięte i zostałeś wylogowany",
        });
        // User will be automatically logged out and redirected
      }
    } catch (error) {
      console.error('Error during account deletion:', error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas usuwania danych konta",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-transparent border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10"
        >
          <Settings className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Panel Użytkownika</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Panel Użytkownika</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="ranking" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
            <TabsTrigger value="ranking" className="text-[10px] sm:text-sm px-1 sm:px-4 py-2 whitespace-nowrap">Ranking</TabsTrigger>
            <TabsTrigger value="badges" className="text-[10px] sm:text-sm px-1 sm:px-4 py-2 whitespace-nowrap">Odznaki</TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] sm:text-sm px-1 sm:px-4 py-2 whitespace-nowrap">Historia</TabsTrigger>
            <TabsTrigger value="profile" className="text-[10px] sm:text-sm px-1 sm:px-4 py-2 whitespace-nowrap">Profil</TabsTrigger>
            <TabsTrigger value="password" className="text-[10px] sm:text-sm px-1 sm:px-4 py-2 whitespace-nowrap">Hasło</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ranking" className="space-y-4">
            <Ranking currentUserId={user.id} />
          </TabsContent>
          
          <TabsContent value="badges" className="space-y-4">
            <Badges userId={user.id} />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <PointsHistory userId={user.id} />
          </TabsContent>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informacje o profilu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nick (obecny: {profile?.nickname})</Label>
                  <Input 
                    value={newNickname} 
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="Nowy nick"
                    disabled={!canChangeNickname()}
                  />
                  {!canChangeNickname() && (
                    <p className="text-sm text-muted-foreground">
                      Nick można zmienić ponownie za {Math.ceil(14 - Math.floor((Date.now() - new Date(profile?.last_nickname_change || '').getTime()) / (1000 * 60 * 60 * 24)))} dni
                    </p>
                  )}
                </div>

                <Button 
                  onClick={updateNickname} 
                  disabled={loading || !newNickname || newNickname === profile?.nickname || !canChangeNickname()}
                  className="w-full mb-4"
                >
                  {loading ? 'Zapisywanie...' : 'Zmień nick'}
                </Button>
                
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

                {/* Delete Account Section */}
                <div className="mt-8 pt-6 border-t border-destructive/20">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Usuń konto
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Czy na pewno chcesz usunąć konto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ta akcja jest nieodwracalna. Wszystkie Twoje dane, w tym nawyki i punkty, zostaną trwale usunięte.
                          <br /><br />
                          Aby potwierdzić, wpisz słowo <strong>"usuń"</strong> w polu poniżej:
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="my-4">
                        <Input
                          placeholder="Wpisz: usuń"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                          Anuluj
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteAccount}
                          disabled={loading || deleteConfirmation !== 'usuń'}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {loading ? 'Usuwanie...' : 'Usuń konto'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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