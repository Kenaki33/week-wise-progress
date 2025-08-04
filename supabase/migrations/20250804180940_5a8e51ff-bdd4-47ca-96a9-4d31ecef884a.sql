-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  personality_value nutrition_personality;
BEGIN
  -- Extract nutrition personality from user metadata
  personality_value := (NEW.raw_user_meta_data ->> 'nutrition_personality')::nutrition_personality;
  
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, nutrition_personality)
  VALUES (NEW.id, personality_value);
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();