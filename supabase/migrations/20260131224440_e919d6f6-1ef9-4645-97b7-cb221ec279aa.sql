-- Create a trigger function to handle new user signups (including OAuth)
-- This ensures player_settings and approval requests are created for ALL signup methods
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_settings_count INTEGER;
  existing_approval_count INTEGER;
  user_email TEXT;
  user_display_name TEXT;
  generated_username TEXT;
BEGIN
  -- Get email from new user
  user_email := NEW.email;
  
  -- Try to get display name from OAuth metadata
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  
  -- Generate a unique username from email or metadata
  generated_username := LOWER(REGEXP_REPLACE(
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(COALESCE(NEW.email, NEW.id::text), '@', 1)
    ),
    '[^a-z0-9]', '', 'g'
  ));
  
  -- Ensure username is at least 3 chars
  IF LENGTH(generated_username) < 3 THEN
    generated_username := 'player' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  
  -- Check if player_settings already exists (for regular email signups that create it in frontend)
  SELECT COUNT(*) INTO existing_settings_count 
  FROM public.player_settings 
  WHERE user_id = NEW.id;
  
  -- Only create player_settings if it doesn't exist
  IF existing_settings_count = 0 THEN
    INSERT INTO public.player_settings (
      user_id,
      username,
      display_name,
      name,
      team,
      position,
      number,
      height,
      grade,
      is_approved
    ) VALUES (
      NEW.id,
      generated_username,
      user_display_name,
      COALESCE(user_display_name, 'Player Name'),
      'Team Name',
      'Guard',
      0,
      '5''8"',
      '1st Grade',
      false
    );
  END IF;
  
  -- Check if approval request already exists
  SELECT COUNT(*) INTO existing_approval_count 
  FROM public.account_approval_requests 
  WHERE user_id = NEW.id;
  
  -- Only create approval request if it doesn't exist
  IF existing_approval_count = 0 THEN
    INSERT INTO public.account_approval_requests (
      user_id,
      email,
      username,
      status
    ) VALUES (
      NEW.id,
      user_email,
      generated_username,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();