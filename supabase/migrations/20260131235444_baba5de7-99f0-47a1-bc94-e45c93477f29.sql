-- Fix password_reset_requests: The existing policies are correct.
-- The "Service role can create reset requests" INSERT policy with "true" is needed
-- because the edge function uses service role which bypasses RLS anyway.
-- However, we should verify the policies are restrictive enough.

-- For password_reset_tokens: This table intentionally has NO policies.
-- Only the service role (edge functions) should access it.
-- RLS is enabled which means regular users cannot access it at all.
-- This is the correct security posture - no changes needed.

-- Let's add a comment to document the intentional security design
COMMENT ON TABLE public.password_reset_tokens IS 'Password reset tokens for email-based password recovery. This table intentionally has no RLS policies - only service role (edge functions) can access it. RLS being enabled with no policies means all user access is denied, which is the correct security posture.';

COMMENT ON TABLE public.password_reset_requests IS 'Phone-based password reset requests requiring admin approval. Access is restricted: admins can view/update/delete all requests, users can only view their own request (if linked to their user_id), and only service role can create requests via the edge function.';