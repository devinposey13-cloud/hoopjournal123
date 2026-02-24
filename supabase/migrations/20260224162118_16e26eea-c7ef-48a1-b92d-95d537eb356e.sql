
-- Plan overrides table for grandfathered users, admin overrides, and promo access
CREATE TABLE public.plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_grandfathered boolean NOT NULL DEFAULT false,
  admin_override_plan text NULL CHECK (admin_override_plan IN ('starter', 'pro', 'elite')),
  promo_access_until timestamp with time zone NULL,
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'pro', 'elite')),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.plan_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view their own plan override
CREATE POLICY "Users can view their own plan override"
ON public.plan_overrides
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all plan overrides
CREATE POLICY "Admins can view all plan overrides"
ON public.plan_overrides
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert plan overrides
CREATE POLICY "Admins can insert plan overrides"
ON public.plan_overrides
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update plan overrides
CREATE POLICY "Admins can update plan overrides"
ON public.plan_overrides
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete plan overrides
CREATE POLICY "Admins can delete plan overrides"
ON public.plan_overrides
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_plan_overrides_updated_at
BEFORE UPDATE ON public.plan_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
