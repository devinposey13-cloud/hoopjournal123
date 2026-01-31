-- Fix 1: Remove the policy that exposes phone numbers on player_settings
DROP POLICY IF EXISTS "Anyone can view public profiles" ON player_settings;

-- Fix 2: Recreate the public_player_profiles view with SECURITY DEFINER
-- This view explicitly excludes sensitive data (phone, name when privacy applies)
DROP VIEW IF EXISTS public_player_profiles;

CREATE VIEW public_player_profiles 
WITH (security_invoker = false)
AS
SELECT 
  id,
  user_id,
  -- Use display_name, mask actual name for privacy
  CASE 
    WHEN display_name IS NOT NULL THEN display_name
    ELSE 'Player'
  END as display_name,
  -- Hide real name, show masked version
  CASE 
    WHEN display_name IS NOT NULL THEN display_name
    ELSE LEFT(name, 1) || '***'
  END as name,
  team,
  position,
  number,
  height,
  grade,
  avatar_url,
  is_profile_public,
  username,
  theme_music_url,
  -- Only show instagram for high school and above (9th grade+)
  CASE 
    WHEN grade IN ('9th Grade', '10th Grade', '11th Grade', '12th Grade') THEN instagram_url
    ELSE NULL
  END as instagram_url,
  created_at,
  updated_at
  -- phone is intentionally excluded
FROM player_settings
WHERE is_profile_public = true;

-- Grant access to the view for public queries
GRANT SELECT ON public_player_profiles TO anon;
GRANT SELECT ON public_player_profiles TO authenticated;

-- Add comment explaining the security design
COMMENT ON VIEW public_player_profiles IS 'Secure view for public profile access. Excludes phone numbers and masks names for privacy. Instagram only shown for 9th grade+.';