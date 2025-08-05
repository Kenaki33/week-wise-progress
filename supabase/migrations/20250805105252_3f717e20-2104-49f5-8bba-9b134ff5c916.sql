-- Usuń istniejące policy dla SELECT
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Stwórz nowe policy które pozwala wszystkim zalogowanym użytkownikom czytać wszystkie profile
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Policy dla UPDATE pozostaje bez zmian (tylko własny profil)
-- Policy dla INSERT pozostaje bez zmian (tylko własny profil)