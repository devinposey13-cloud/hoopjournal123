
-- 1. Fix plan_overrides: restrict user INSERT to only free plan
DROP POLICY IF EXISTS "Users can insert their own plan override" ON public.plan_overrides;
CREATE POLICY "Users can insert their own plan override"
ON public.plan_overrides
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND subscription_plan = 'free'
  AND admin_override_plan IS NULL
);

-- 2. Fix quick_cards: remove overly broad claim_token SELECT policy
-- The current policy exposes all cards with a claim_token to every authenticated user
DROP POLICY IF EXISTS "Users can lookup cards by claim token" ON public.quick_cards;
-- Replace with a policy that only allows access via the claim-card edge function (service role)
-- Users can still look up cards by claim_code and view their own claimed cards via existing policies

-- 3. Fix realtime: remove sensitive admin-only tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.password_reset_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.account_approval_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_feedback;
ALTER PUBLICATION supabase_realtime DROP TABLE public.content_reports;
ALTER PUBLICATION supabase_realtime DROP TABLE public.slack_alert_history;

-- 4. Fix claim_recovery_requests: restrict INSERT to own user_id
DROP POLICY IF EXISTS "Authenticated users can create recovery requests" ON public.claim_recovery_requests;
CREATE POLICY "Authenticated users can create recovery requests"
ON public.claim_recovery_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
