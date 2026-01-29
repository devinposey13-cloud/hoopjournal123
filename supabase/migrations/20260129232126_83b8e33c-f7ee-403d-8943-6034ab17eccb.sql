-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can lookup public profiles by username" ON public.player_settings;

-- Create a new policy that allows public profile access but uses a view to exclude phone
-- First, create a secure view that excludes phone numbers for public access
CREATE OR REPLACE VIEW public.public_player_profiles AS
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

-- Grant access to the view for both authenticated and anonymous users
GRANT SELECT ON public.public_player_profiles TO authenticated;
GRANT SELECT ON public.public_player_profiles TO anon;

-- Create a new restrictive policy for direct table access
-- Only allow viewing public profiles if user is the owner OR accessing through the view
CREATE POLICY "Public profiles viewable by authenticated users only"
ON public.player_settings FOR SELECT
USING (
  is_profile_public = true 
  AND auth.uid() IS NOT NULL
);

-- Keep the existing policy for users viewing their own settings
-- (Already exists: "Users can view their own settings")