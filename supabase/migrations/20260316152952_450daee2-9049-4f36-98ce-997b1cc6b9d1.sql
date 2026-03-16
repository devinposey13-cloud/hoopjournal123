
-- Add flag_value column to feature_flags
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS flag_value text DEFAULT NULL;

-- Add approval_method column to account_approval_requests
ALTER TABLE public.account_approval_requests ADD COLUMN IF NOT EXISTS approval_method text DEFAULT 'manual';

-- Insert the user_approval_mode feature flag (default to automatic)
INSERT INTO public.feature_flags (flag_key, flag_label, description, is_enabled, flag_value)
VALUES ('user_approval_mode', 'User Approval Mode', 'Controls how new signups are approved: automatic, manual, or conditional', true, 'automatic')
ON CONFLICT DO NOTHING;

-- Update handle_new_user trigger function to check approval mode
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_settings_count INTEGER;
  existing_approval_count INTEGER;
  user_email TEXT;
  user_display_name TEXT;
  generated_username TEXT;
  approval_mode TEXT;
  should_auto_approve BOOLEAN := false;
  is_suspicious BOOLEAN := false;
  disposable_domains TEXT[] := ARRAY['mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com','sharklasers.com','guerrillamailblock.com','grr.la','dispostable.com','fakeinbox.com'];
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
  
  -- Read the approval mode from feature_flags
  SELECT COALESCE(flag_value, 'automatic') INTO approval_mode
  FROM public.feature_flags
  WHERE flag_key = 'user_approval_mode' AND is_enabled = true
  LIMIT 1;
  
  -- Default to automatic if no flag found
  IF approval_mode IS NULL THEN
    approval_mode := 'automatic';
  END IF;
  
  -- Determine auto-approve based on mode
  IF approval_mode = 'automatic' THEN
    should_auto_approve := true;
  ELSIF approval_mode = 'conditional' THEN
    -- Check for suspicious patterns
    IF user_email IS NOT NULL THEN
      -- Check disposable email domains
      IF LOWER(split_part(user_email, '@', 2)) = ANY(disposable_domains) THEN
        is_suspicious := true;
      END IF;
    ELSE
      -- No email at all is suspicious
      is_suspicious := true;
    END IF;
    
    should_auto_approve := NOT is_suspicious;
  END IF;
  -- For 'manual' mode, should_auto_approve stays false
  
  -- Check if player_settings already exists
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
      should_auto_approve
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
      status,
      approval_method
    ) VALUES (
      NEW.id,
      user_email,
      generated_username,
      CASE WHEN should_auto_approve THEN 'approved' ELSE 'pending' END,
      CASE 
        WHEN should_auto_approve AND approval_mode = 'automatic' THEN 'auto'
        WHEN should_auto_approve AND approval_mode = 'conditional' THEN 'auto'
        WHEN NOT should_auto_approve AND approval_mode = 'conditional' THEN 'conditional_flagged'
        ELSE 'manual'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
