-- Create milestone_definitions table
CREATE TABLE public.milestone_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('single_game', 'multi_game', 'season')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  icon TEXT NOT NULL,
  check_type TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  secondary_threshold INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.milestone_definitions ENABLE ROW LEVEL SECURITY;

-- Anyone can view milestone definitions
CREATE POLICY "Anyone can view milestone definitions"
ON public.milestone_definitions FOR SELECT
USING (true);

-- Create player_milestones table
CREATE TABLE public.player_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  milestone_id UUID NOT NULL REFERENCES public.milestone_definitions(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stats_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_viewed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, milestone_id, game_id)
);

-- Enable RLS
ALTER TABLE public.player_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_milestones
CREATE POLICY "Users can view their own milestones"
ON public.player_milestones FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own milestones"
ON public.player_milestones FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones"
ON public.player_milestones FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view milestones of public profiles"
ON public.player_milestones FOR SELECT
USING (EXISTS (
  SELECT 1 FROM player_settings ps
  WHERE ps.user_id = player_milestones.user_id AND ps.is_profile_public = true
));

-- Insert milestone definitions
-- Single Game Milestones
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold) VALUES
('Sharpshooter', 'Made 2+ three-pointers in one game', 'single_game', 'uncommon', 'target', 'three_pt_made_gte', 2),
('Double-Double', 'Recorded 10+ in two stat categories', 'single_game', 'rare', 'star', 'double_double', 10),
('Triple-Double', 'Recorded 10+ in three stat categories', 'single_game', 'legendary', 'crown', 'triple_double', 10),
('Lockdown Defender', 'Recorded 3+ steals in one game', 'single_game', 'rare', 'shield', 'steals_gte', 3),
('Shot Blocker', 'Recorded 3+ blocks in one game', 'single_game', 'rare', 'hand', 'blocks_gte', 3),
('Assist Master', 'Dished out 6+ assists in one game', 'single_game', 'uncommon', 'users', 'assists_gte', 6),
('Scoring Machine', 'Scored 20+ points in one game', 'single_game', 'epic', 'flame', 'points_gte', 20),
('Rebound King', 'Grabbed 10+ rebounds in one game', 'single_game', 'rare', 'arrow-up', 'rebounds_gte', 10),
('Perfect from the Line', 'Made 5+ free throws at 100%', 'single_game', 'epic', 'circle', 'perfect_ft', 5),
('Efficient Scorer', 'Shot 60%+ FG with 10+ points', 'single_game', 'rare', 'crosshair', 'efficient_scorer', 60),
('First Bucket', 'Scored your first points', 'single_game', 'common', 'zap', 'points_gte', 1),
('Dime Dropper', 'Got your first assist', 'single_game', 'common', 'send', 'assists_gte', 1),
('Board Getter', 'Grabbed your first rebound', 'single_game', 'common', 'box', 'rebounds_gte', 1),
('Thief', 'Got your first steal', 'single_game', 'common', 'eye', 'steals_gte', 1),
('Swat', 'Got your first block', 'single_game', 'common', 'shield-off', 'blocks_gte', 1);

-- Multi-Game Milestones
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, secondary_threshold) VALUES
('Consistent Shooter', 'Shot 50%+ FG over 2 consecutive games', 'multi_game', 'uncommon', 'trending-up', 'fg_pct_streak', 50, 2),
('3-Point Streak', 'Made a three in 3 consecutive games', 'multi_game', 'rare', 'zap', 'three_streak', 1, 3),
('Win Streak', 'Won 3 games in a row', 'multi_game', 'rare', 'trophy', 'win_streak', 3, 3),
('Iron Man', 'Played 5+ games in a season', 'multi_game', 'uncommon', 'medal', 'games_played', 5, 1),
('Season Starter', 'Logged your first game of the season', 'multi_game', 'common', 'play', 'first_game', 1, 1);

-- Season Cumulative Milestones
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold) VALUES
('100 Point Club', 'Scored 100 total points in a season', 'single_game', 'epic', 'star', 'season_points', 100),
('Block Party', 'Recorded 20 total blocks in a season', 'season', 'rare', 'shield', 'season_blocks', 20),
('Steal Master', 'Recorded 30 total steals in a season', 'season', 'rare', 'eye', 'season_steals', 30),
('Rebound Machine', 'Grabbed 75 total rebounds in a season', 'season', 'epic', 'arrow-up', 'season_rebounds', 75),
('Playmaker', 'Dished out 50 total assists in a season', 'season', 'epic', 'users', 'season_assists', 50),
('50 Three-Pointers', 'Made 50 three-pointers in a season', 'season', 'legendary', 'target', 'season_threes', 50),
('250 Point Club', 'Scored 250 total points in a season', 'season', 'legendary', 'flame', 'season_points', 250);

-- Drop trading_cards table (no longer needed)
DROP TABLE IF EXISTS public.trading_cards CASCADE;