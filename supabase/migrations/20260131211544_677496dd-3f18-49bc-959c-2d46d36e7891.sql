-- Create table to track first-time performance tier achievements
CREATE TABLE public.player_tier_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier TEXT NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  performance_score NUMERIC NOT NULL,
  UNIQUE(user_id, tier)
);

-- Enable Row Level Security
ALTER TABLE public.player_tier_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tier achievements"
ON public.player_tier_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tier achievements"
ON public.player_tier_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view tier achievements of public profiles"
ON public.player_tier_achievements
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM player_settings ps
  WHERE ps.user_id = player_tier_achievements.user_id
  AND ps.is_profile_public = true
));