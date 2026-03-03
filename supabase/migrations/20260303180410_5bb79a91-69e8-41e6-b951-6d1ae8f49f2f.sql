
CREATE TABLE public.policy_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  policy_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own policy views"
  ON public.policy_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own policy views"
  ON public.policy_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_policy_views_user_id ON public.policy_views (user_id);
CREATE INDEX idx_policy_views_policy_type ON public.policy_views (user_id, policy_type);
