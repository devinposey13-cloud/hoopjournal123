
-- Drop the overly broad user UPDATE policy
DROP POLICY "Users can update their own plan override" ON plan_overrides;

-- Create restrictive policy: users can update their row BUT cannot change subscription_plan or admin_override_plan
CREATE POLICY "Users can update safe fields only" ON plan_overrides
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.plan_overrides_sensitive_unchanged(user_id, subscription_plan, admin_override_plan)
  );
