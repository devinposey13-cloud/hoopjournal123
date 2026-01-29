-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.public_player_profiles;

CREATE VIEW public.public_player_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id, 
  user_id, 
  name, 
  team, 
  position, 
  number, 
  height, 
  grade,
  avatar_url, 
  display_name, 
  is_profile_public, 
  username, 
  instagram_url,
  theme_music_url,
  created_at, 
  updated_at
  -- Explicitly excluding: phone
FROM player_settings
WHERE is_profile_public = true;

-- Re-grant access to the view
GRANT SELECT ON public.public_player_profiles TO authenticated;
GRANT SELECT ON public.public_player_profiles TO anon;