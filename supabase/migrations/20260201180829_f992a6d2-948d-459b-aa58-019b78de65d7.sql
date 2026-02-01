-- Fix: player_settings - Add explicit restrictive policy to block anonymous access
-- This ensures that even if permissive policies exist, unauthenticated users are blocked
CREATE POLICY "Block anonymous access to player_settings"
ON public.player_settings
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Fix: password_reset_tokens - Document intentional security design
-- RLS is enabled with NO policies = default deny all client access
-- Only service role can access this table (bypasses RLS)
COMMENT ON TABLE public.password_reset_tokens IS 
'SECURITY: This table intentionally has NO RLS policies. With RLS enabled and no policies, 
all client-side access is denied by default. Only the service role (used by edge functions) 
can access this table, which is the correct security posture for password reset tokens. 
This is a "default deny" security pattern - do not add permissive policies.';

-- Also add comment to rate_limits which has same pattern
COMMENT ON TABLE public.rate_limits IS 
'SECURITY: This table intentionally has NO RLS policies. With RLS enabled and no policies, 
all client-side access is denied by default. Only the service role (used by edge functions) 
can access this table for rate limiting. This is a "default deny" security pattern.';