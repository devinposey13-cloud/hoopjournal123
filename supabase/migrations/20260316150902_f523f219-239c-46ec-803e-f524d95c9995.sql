
-- Slack integration configuration (admin-only)
CREATE TABLE public.slack_integration_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.slack_integration_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage slack config" ON public.slack_integration_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Alert category preferences
CREATE TABLE public.slack_alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'info',
  frequency text NOT NULL DEFAULT 'realtime',
  channel_override text,
  quiet_hours_start text,
  quiet_hours_end text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slack_alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert preferences" ON public.slack_alert_preferences
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read alert preferences" ON public.slack_alert_preferences
  FOR SELECT TO authenticated
  USING (true);

-- Alert history / delivery log
CREATE TABLE public.slack_alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message_preview text,
  channel text,
  delivery_status text NOT NULL DEFAULT 'pending',
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  dedup_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

ALTER TABLE public.slack_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert history" ON public.slack_alert_history
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default alert categories
INSERT INTO public.slack_alert_preferences (category, is_enabled, severity, frequency) VALUES
  ('new_user_signup', true, 'info', 'realtime'),
  ('new_paid_subscription', true, 'info', 'realtime'),
  ('failed_payment', true, 'warning', 'realtime'),
  ('canceled_subscription', true, 'warning', 'realtime'),
  ('new_support_request', true, 'info', 'realtime'),
  ('reported_content', true, 'warning', 'realtime'),
  ('user_feedback', true, 'info', 'realtime'),
  ('backend_failure', true, 'critical', 'realtime'),
  ('milestone_alert', false, 'info', 'batched_hourly'),
  ('admin_audit', true, 'info', 'realtime'),
  ('churn_risk', false, 'warning', 'daily_digest'),
  ('high_engagement', false, 'info', 'daily_digest');

-- Enable realtime for alert history
ALTER PUBLICATION supabase_realtime ADD TABLE public.slack_alert_history;
