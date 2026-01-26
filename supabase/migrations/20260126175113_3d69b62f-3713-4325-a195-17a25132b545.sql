-- Allow reading games for users with public profiles (for public profile stats)
CREATE POLICY "Anyone can view games of public profiles"
ON public.games
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.player_settings ps 
    WHERE ps.user_id = games.user_id 
    AND ps.is_profile_public = true
  )
);