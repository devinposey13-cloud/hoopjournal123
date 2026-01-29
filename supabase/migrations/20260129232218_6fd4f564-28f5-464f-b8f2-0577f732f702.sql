-- We need to allow unauthenticated users to view public profiles through the view
-- But the view uses SECURITY INVOKER, so we need a policy on the base table
-- that allows SELECT for public profiles without requiring auth

-- Drop the restrictive policy we just created
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users only" ON public.player_settings;

-- Create a policy that allows viewing public profiles for anyone (auth or anon)
-- This is needed for the view to work with security_invoker
CREATE POLICY "Anyone can view public profiles"
ON public.player_settings FOR SELECT
USING (is_profile_public = true);