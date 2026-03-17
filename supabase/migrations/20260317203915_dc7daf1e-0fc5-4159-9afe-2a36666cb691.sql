-- Add trial eligibility tracking fields to plan_overrides
ALTER TABLE public.plan_overrides
  ADD COLUMN IF NOT EXISTS trial_eligible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_eligibility_reset_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_trial_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_trial_reset_by uuid,
  ADD COLUMN IF NOT EXISTS last_trial_reset_reason text;

-- Create admin trial reset audit log table
CREATE TABLE IF NOT EXISTS public.admin_trial_reset_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_user_email text,
  admin_user_id uuid NOT NULL,
  admin_email text,
  reason_category text NOT NULL,
  additional_note text,
  previous_trial_eligible boolean NOT NULL,
  new_trial_eligible boolean NOT NULL,
  reset_count_before integer NOT NULL,
  reset_count_after integer NOT NULL,
  success boolean NOT NULL DEFAULT true,
  error_details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_trial_reset_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write audit logs
CREATE POLICY "Admins can manage trial reset logs"
  ON public.admin_trial_reset_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));