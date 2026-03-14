
-- Feature flags table for admin-controlled feature toggles
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  flag_label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags (needed for frontend checks)
CREATE POLICY "Anyone can view feature flags" ON public.feature_flags
  FOR SELECT TO public USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Broadcast messages table
CREATE TABLE public.broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all',
  sent_by uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage broadcasts" ON public.broadcast_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view broadcasts" ON public.broadcast_messages
  FOR SELECT TO authenticated USING (true);

-- Seed default feature flags
INSERT INTO public.feature_flags (flag_key, flag_label, description, is_enabled) VALUES
  ('mini_games', 'Mini Games', 'Enable the mini games hub (trivia, free throw, etc.)', true),
  ('public_profiles', 'Public Profiles', 'Allow users to make their profiles public', true),
  ('parent_dashboard', 'Parent Dashboard', 'Enable the parent dashboard sharing feature', true),
  ('ring_of_honor', 'Ring of Honor', 'Enable Ring of Honor quarterly leaderboard', true),
  ('coach_ai', 'Coach AI', 'Enable the AI coaching chat feature', true),
  ('public_leaderboards', 'Public Leaderboards', 'Enable public-facing leaderboards', true);
