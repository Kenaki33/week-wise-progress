-- Usuń istniejące policy dla SELECT na tabeli habits
DROP POLICY IF EXISTS "Users can view their own habits" ON public.habits;

-- Stwórz nowe policy które pozwala wszystkim zalogowanym użytkownikom czytać wszystkie habits
CREATE POLICY "Authenticated users can view all habits" 
ON public.habits 
FOR SELECT 
TO authenticated
USING (true);

-- Policy dla INSERT, UPDATE, DELETE pozostają bez zmian (tylko własne habits)