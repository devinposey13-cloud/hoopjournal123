-- Create badge_definitions table
CREATE TABLE public.badge_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  bronze_threshold JSONB NOT NULL DEFAULT '{}',
  silver_threshold JSONB NOT NULL DEFAULT '{}',
  gold_threshold JSONB NOT NULL DEFAULT '{}',
  hof_threshold JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on badge_definitions
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

-- Anyone can view badge definitions (they're static)
CREATE POLICY "Anyone can view badge definitions"
ON public.badge_definitions
FOR SELECT
USING (true);

-- Create trading_cards table
CREATE TABLE public.trading_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  season_id UUID REFERENCES public.seasons(id),
  rarity TEXT NOT NULL DEFAULT 'bronze',
  overall_rating INTEGER NOT NULL DEFAULT 50,
  offense_rating INTEGER NOT NULL DEFAULT 50,
  defense_rating INTEGER NOT NULL DEFAULT 50,
  playmaking_rating INTEGER NOT NULL DEFAULT 50,
  athleticism_rating INTEGER NOT NULL DEFAULT 50,
  iq_rating INTEGER NOT NULL DEFAULT 50,
  player_title TEXT,
  scouting_report TEXT,
  stats_snapshot JSONB NOT NULL DEFAULT '{}',
  badges_earned JSONB NOT NULL DEFAULT '[]',
  games_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trading_cards
ALTER TABLE public.trading_cards ENABLE ROW LEVEL SECURITY;

-- Users can view their own cards
CREATE POLICY "Users can view their own cards"
ON public.trading_cards
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own cards
CREATE POLICY "Users can create their own cards"
ON public.trading_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cards
CREATE POLICY "Users can delete their own cards"
ON public.trading_cards
FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can view cards of public profiles
CREATE POLICY "Anyone can view cards of public profiles"
ON public.trading_cards
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM player_settings ps
  WHERE ps.user_id = trading_cards.user_id
  AND ps.is_profile_public = true
));

-- Create player_badges table (tracks earned badges per season)
CREATE TABLE public.player_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_name TEXT NOT NULL,
  badge_category TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'hof')),
  season_id UUID REFERENCES public.seasons(id),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_name, season_id)
);

-- Enable RLS on player_badges
ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges
CREATE POLICY "Users can view their own badges"
ON public.player_badges
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own badges
CREATE POLICY "Users can create their own badges"
ON public.player_badges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own badges
CREATE POLICY "Users can update their own badges"
ON public.player_badges
FOR UPDATE
USING (auth.uid() = user_id);

-- Anyone can view badges of public profiles
CREATE POLICY "Anyone can view badges of public profiles"
ON public.player_badges
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM player_settings ps
  WHERE ps.user_id = player_badges.user_id
  AND ps.is_profile_public = true
));

-- Insert default badge definitions
INSERT INTO public.badge_definitions (name, category, icon, description, bronze_threshold, silver_threshold, gold_threshold, hof_threshold) VALUES
-- Finishing Badges
('Posterizer', 'finishing', 'flame', 'Dominant scorer who attacks the rim with power', '{"ppg": 10, "fg_pct": 40}', '{"ppg": 15, "fg_pct": 45}', '{"ppg": 20, "fg_pct": 50}', '{"ppg": 25, "fg_pct": 55}'),
('Paint Beast', 'finishing', 'target', 'Dominates in the paint with scoring and rebounding', '{"ppg": 8, "rpg": 5}', '{"ppg": 12, "rpg": 7}', '{"ppg": 16, "rpg": 9}', '{"ppg": 20, "rpg": 12}'),
('Contact Finisher', 'finishing', 'zap', 'Finishes through contact with ease', '{"ppg": 12, "fg_pct": 42}', '{"ppg": 16, "fg_pct": 46}', '{"ppg": 20, "fg_pct": 50}', '{"ppg": 24, "fg_pct": 54}'),

-- Shooting Badges
('Deadeye', 'shooting', 'crosshair', 'Deadly shooter from beyond the arc', '{"three_pct": 30}', '{"three_pct": 35}', '{"three_pct": 40}', '{"three_pct": 45}'),
('Limitless Range', 'shooting', 'target', 'Can score from anywhere on the court', '{"three_pct": 28, "ppg": 8}', '{"three_pct": 33, "ppg": 12}', '{"three_pct": 38, "ppg": 16}', '{"three_pct": 43, "ppg": 20}'),
('Clutch Shooter', 'shooting', 'star', 'Ice in their veins from the free throw line', '{"ft_pct": 70}', '{"ft_pct": 78}', '{"ft_pct": 85}', '{"ft_pct": 92}'),

-- Playmaking Badges
('Dimer', 'playmaking', 'users', 'Elite passer who makes teammates better', '{"apg": 3}', '{"apg": 5}', '{"apg": 8}', '{"apg": 12}'),
('Floor General', 'playmaking', 'crown', 'Commands the offense with high basketball IQ', '{"apg": 4, "ast_to_ratio": 1.5}', '{"apg": 6, "ast_to_ratio": 2}', '{"apg": 8, "ast_to_ratio": 2.5}', '{"apg": 10, "ast_to_ratio": 3}'),
('Handles for Days', 'playmaking', 'move', 'Takes care of the ball while creating plays', '{"apg": 3, "low_to": true}', '{"apg": 5, "low_to": true}', '{"apg": 7, "low_to": true}', '{"apg": 10, "low_to": true}'),

-- Defense Badges
('Interceptor', 'defense', 'shield', 'Ball hawk who disrupts passing lanes', '{"spg": 1}', '{"spg": 1.5}', '{"spg": 2}', '{"spg": 3}'),
('Rim Protector', 'defense', 'shield-check', 'Intimidating presence protecting the paint', '{"bpg": 1}', '{"bpg": 1.5}', '{"bpg": 2}', '{"bpg": 3}'),
('Pick Pocket', 'defense', 'hand', 'Quick hands that create turnovers', '{"spg": 1.2}', '{"spg": 1.8}', '{"spg": 2.5}', '{"spg": 3.5}'),

-- Rebounding Badges
('Rebound Chaser', 'rebounding', 'arrow-up', 'Relentless on the glass', '{"rpg": 5}', '{"rpg": 7}', '{"rpg": 10}', '{"rpg": 14}'),
('Box Out Beast', 'rebounding', 'square', 'Controls the boards with positioning', '{"rpg": 6}', '{"rpg": 8}', '{"rpg": 11}', '{"rpg": 15}'),
('Putback Boss', 'rebounding', 'repeat', 'Scores on offensive rebounds', '{"rpg": 4, "ppg": 8}', '{"rpg": 6, "ppg": 12}', '{"rpg": 8, "ppg": 16}', '{"rpg": 10, "ppg": 20}');