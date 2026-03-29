
CREATE TABLE public.conditioning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.player_settings(id),
  activity_type TEXT NOT NULL DEFAULT 'run',
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  elapsed_seconds INTEGER,
  total_distance_meters NUMERIC,
  gps_points JSONB DEFAULT '[]'::jsonb,
  gps_point_count INTEGER DEFAULT 0,
  average_accuracy NUMERIC,
  max_speed NUMERIC,
  pause_count INTEGER DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'manual_entry',
  notes TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conditioning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own conditioning sessions"
ON public.conditioning_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own conditioning sessions"
ON public.conditioning_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own conditioning sessions"
ON public.conditioning_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conditioning sessions"
ON public.conditioning_sessions FOR DELETE
USING (auth.uid() = user_id);
