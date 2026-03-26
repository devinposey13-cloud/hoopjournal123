
-- Quick Mode event cards table
CREATE TABLE public.quick_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_admin_id uuid NOT NULL,
  player_name text NOT NULL,
  team_name text NOT NULL,
  jersey_number integer NOT NULL,
  position text,
  photo_url text,
  template_used text NOT NULL,
  grade text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  card_headline text,
  card_source text NOT NULL DEFAULT 'event_quick_mode',
  verification_status text NOT NULL DEFAULT 'promo_generated',
  eligible_for_leaderboards boolean NOT NULL DEFAULT false,
  eligible_for_career_stats boolean NOT NULL DEFAULT false,
  eligible_for_xp_progression boolean NOT NULL DEFAULT false,
  claimed_by_user_id uuid,
  claim_code text,
  print_count integer NOT NULL DEFAULT 0,
  contact_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log for quick mode actions
CREATE TABLE public.quick_mode_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  card_id uuid REFERENCES public.quick_cards(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_mode_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can manage quick cards
CREATE POLICY "Admins can manage quick cards" ON public.quick_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Claimed users can view their own claimed cards
CREATE POLICY "Users can view their claimed cards" ON public.quick_cards
  FOR SELECT TO authenticated
  USING (auth.uid() = claimed_by_user_id);

-- Only admins can manage audit logs
CREATE POLICY "Admins can manage audit logs" ON public.quick_mode_audit_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
