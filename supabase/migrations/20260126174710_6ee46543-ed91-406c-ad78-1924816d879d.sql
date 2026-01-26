-- Add is_profile_public column to player_settings
ALTER TABLE public.player_settings 
ADD COLUMN is_profile_public BOOLEAN NOT NULL DEFAULT false;

-- Now create the RLS policy for public profile lookup
CREATE POLICY "Anyone can lookup public profiles by username"
ON public.player_settings
FOR SELECT
USING (is_profile_public = true);