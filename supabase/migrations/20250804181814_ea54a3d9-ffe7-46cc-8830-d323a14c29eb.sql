-- Update function to handle nickname
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  personality_value public.nutrition_personality;
  nickname_value TEXT;
BEGIN
  -- Extract nutrition personality and nickname from user metadata
  personality_value := (NEW.raw_user_meta_data ->> 'nutrition_personality')::public.nutrition_personality;
  nickname_value := NEW.raw_user_meta_data ->> 'nickname';
  
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, nutrition_personality, nickname)
  VALUES (NEW.id, personality_value, nickname_value);
  
  RETURN NEW;
END;
$$;