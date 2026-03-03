
CREATE TABLE public.age_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  age_declared text NOT NULL CHECK (age_declared IN ('13_or_older', 'under_13')),
  parent_consent boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  ip_address text,
  device_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.age_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own age confirmation"
  ON public.age_confirmations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own age confirmation"
  ON public.age_confirmations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all age confirmations"
  ON public.age_confirmations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
