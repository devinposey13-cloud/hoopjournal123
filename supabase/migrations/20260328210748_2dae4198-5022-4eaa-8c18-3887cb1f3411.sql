
CREATE TABLE public.practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.player_settings(id),
  practice_type TEXT NOT NULL DEFAULT 'shooting',
  ft_made INTEGER NOT NULL DEFAULT 0,
  ft_attempted INTEGER NOT NULL DEFAULT 0,
  midrange_made INTEGER NOT NULL DEFAULT 0,
  midrange_attempted INTEGER NOT NULL DEFAULT 0,
  three_pt_made INTEGER NOT NULL DEFAULT 0,
  three_pt_attempted INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own practice sessions"
  ON public.practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
  ON public.practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice sessions"
  ON public.practice_sessions FOR DELETE
  USING (auth.uid() = user_id);
