-- Create player_xp_progress table for current quarter tracking
CREATE TABLE public.player_xp_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quarter text NOT NULL,
  current_xp integer NOT NULL DEFAULT 0,
  current_level integer NOT NULL DEFAULT 1,
  peak_level integer NOT NULL DEFAULT 1,
  games_logged integer NOT NULL DEFAULT 0,
  total_performance_score numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, quarter)
);

-- Create player_xp_history table for archived quarters
CREATE TABLE public.player_xp_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quarter text NOT NULL,
  final_level integer NOT NULL,
  total_xp_earned integer NOT NULL,
  games_played integer NOT NULL,
  avg_performance numeric,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, quarter)
);

-- Create level_rewards table for milestone rewards
CREATE TABLE public.level_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_required integer NOT NULL,
  reward_type text NOT NULL,
  reward_name text NOT NULL,
  reward_icon text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create player_level_rewards table for tracking unlocked rewards
CREATE TABLE public.player_level_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL REFERENCES public.level_rewards(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  unlocked_quarter text NOT NULL,
  UNIQUE(user_id, reward_id)
);

-- Enable RLS on all tables
ALTER TABLE public.player_xp_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_level_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_xp_progress
CREATE POLICY "Users can view their own XP progress"
  ON public.player_xp_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own XP progress"
  ON public.player_xp_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own XP progress"
  ON public.player_xp_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view XP progress of public profiles"
  ON public.player_xp_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM player_settings ps
    WHERE ps.user_id = player_xp_progress.user_id
    AND ps.is_profile_public = true
  ));

-- RLS policies for player_xp_history
CREATE POLICY "Users can view their own XP history"
  ON public.player_xp_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own XP history"
  ON public.player_xp_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view XP history of public profiles"
  ON public.player_xp_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM player_settings ps
    WHERE ps.user_id = player_xp_history.user_id
    AND ps.is_profile_public = true
  ));

-- RLS policies for level_rewards (read-only for all)
CREATE POLICY "Anyone can view level rewards"
  ON public.level_rewards FOR SELECT
  USING (true);

-- RLS policies for player_level_rewards
CREATE POLICY "Users can view their own level rewards"
  ON public.player_level_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own level rewards"
  ON public.player_level_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view rewards of public profiles"
  ON public.player_level_rewards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM player_settings ps
    WHERE ps.user_id = player_level_rewards.user_id
    AND ps.is_profile_public = true
  ));

-- Create trigger for updated_at on player_xp_progress
CREATE TRIGGER update_player_xp_progress_updated_at
  BEFORE UPDATE ON public.player_xp_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();