ALTER TABLE public.conditioning_sessions
  ADD COLUMN IF NOT EXISTS tracking_mode text NOT NULL DEFAULT 'foreground',
  ADD COLUMN IF NOT EXISTS background_tracking_enabled boolean NOT NULL DEFAULT false;