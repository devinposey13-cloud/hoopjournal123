
-- Security definer function to verify sensitive plan fields haven't been tampered with
CREATE OR REPLACE FUNCTION public.plan_overrides_sensitive_unchanged(
  _user_id uuid,
  _new_subscription_plan text,
  _new_admin_override_plan text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.plan_overrides
    WHERE user_id = _user_id
      AND subscription_plan = _new_subscription_plan
      AND admin_override_plan IS NOT DISTINCT FROM _new_admin_override_plan
  )
$$;
