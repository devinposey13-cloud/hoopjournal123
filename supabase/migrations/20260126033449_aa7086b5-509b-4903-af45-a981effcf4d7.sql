-- Create games table for storing game statistics
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  opponent TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rebounds INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  steals INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0,
  turnovers INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  fg_made INTEGER NOT NULL DEFAULT 0,
  fg_attempted INTEGER NOT NULL DEFAULT 0,
  three_pt_made INTEGER NOT NULL DEFAULT 0,
  three_pt_attempted INTEGER NOT NULL DEFAULT 0,
  ft_made INTEGER NOT NULL DEFAULT 0,
  ft_attempted INTEGER NOT NULL DEFAULT 0,
  is_win BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create scheduled_games table
CREATE TABLE public.scheduled_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  time TEXT NOT NULL,
  opponent TEXT NOT NULL,
  location TEXT NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create video_clips table
CREATE TABLE public.video_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create player_settings table for storing player profile info per user
CREATE TABLE public.player_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Player Name',
  team TEXT NOT NULL DEFAULT 'Team Name',
  position TEXT NOT NULL DEFAULT 'Guard',
  number INTEGER NOT NULL DEFAULT 23,
  height TEXT NOT NULL DEFAULT '5''8"',
  grade TEXT NOT NULL DEFAULT '8th Grade',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games table
CREATE POLICY "Users can view their own games"
  ON public.games FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own games"
  ON public.games FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own games"
  ON public.games FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for scheduled_games table
CREATE POLICY "Users can view their own scheduled games"
  ON public.scheduled_games FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled games"
  ON public.scheduled_games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled games"
  ON public.scheduled_games FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled games"
  ON public.scheduled_games FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for video_clips table
CREATE POLICY "Users can view their own clips"
  ON public.video_clips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clips"
  ON public.video_clips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clips"
  ON public.video_clips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clips"
  ON public.video_clips FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for player_settings table
CREATE POLICY "Users can view their own settings"
  ON public.player_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
  ON public.player_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.player_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_player_settings_updated_at
  BEFORE UPDATE ON public.player_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for video clips
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-clips', 'video-clips', false);

-- Storage policies for video clips bucket
CREATE POLICY "Users can view their own video clips"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-clips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own video clips"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video-clips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own video clips"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'video-clips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own video clips"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'video-clips' AND auth.uid()::text = (storage.foldername(name))[1]);