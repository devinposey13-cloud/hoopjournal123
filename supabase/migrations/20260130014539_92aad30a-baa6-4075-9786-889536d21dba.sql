-- Drop existing view
DROP VIEW IF EXISTS public.public_player_profiles;

-- Create updated view that prioritizes display_name for privacy
-- and excludes instagram_url for better minor protection
CREATE VIEW public.public_player_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  -- Use display_name if set, otherwise use first name only for privacy
  COALESCE(display_name, split_part(name, ' ', 1)) as name,
  team,
  "position",
  number,
  height,
  grade,
  avatar_url,
  display_name,
  is_profile_public,
  username,
  -- Only show instagram for high school grades (9th-12th)
  CASE 
    WHEN grade IN ('9th Grade', '10th Grade', '11th Grade', '12th Grade') THEN instagram_url
    ELSE NULL
  END as instagram_url,
  theme_music_url,
  created_at,
  updated_at
FROM player_settings
WHERE is_profile_public = true;

COMMENT ON VIEW public.public_player_profiles IS 'Safe public view of player profiles that protects minor privacy by showing display_name instead of full name and hiding Instagram for younger grades';