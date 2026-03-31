
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  reason text,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  unblocked_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage blocked users"
  ON public.blocked_users
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can check if they are blocked
CREATE POLICY "Users can check own block status"
  ON public.blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Unique constraint: one active block per user
CREATE UNIQUE INDEX idx_blocked_users_active ON public.blocked_users (user_id) WHERE is_active = true;
