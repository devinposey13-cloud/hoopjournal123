-- Create seasons table
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- RLS policies for seasons
CREATE POLICY "Users can view their own seasons"
ON public.seasons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seasons"
ON public.seasons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seasons"
ON public.seasons FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seasons"
ON public.seasons FOR DELETE
USING (auth.uid() = user_id);

-- Add season_id to games table (nullable for backwards compatibility)
ALTER TABLE public.games ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

-- Add season_id to scheduled_games table
ALTER TABLE public.scheduled_games ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

-- Add season_id to video_clips table  
ALTER TABLE public.video_clips ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;