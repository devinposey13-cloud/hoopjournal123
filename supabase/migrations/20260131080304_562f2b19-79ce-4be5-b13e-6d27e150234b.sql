-- Create monthly_challenges table for challenge definitions
CREATE TABLE public.monthly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  check_type TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  secondary_threshold INTEGER,
  month TEXT NOT NULL, -- Format: "2026-02"
  reward_points INTEGER NOT NULL DEFAULT 50,
  difficulty TEXT NOT NULL DEFAULT 'medium', -- easy, medium, hard
  is_active BOOLEAN NOT NULL DEFAULT false,
  theme_name TEXT, -- e.g., "Winter Grind", "March Madness"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge_progress table for per-user tracking
CREATE TABLE public.challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.monthly_challenges(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS on both tables
ALTER TABLE public.monthly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly_challenges (read-only for users)
CREATE POLICY "Anyone can view active challenges"
  ON public.monthly_challenges
  FOR SELECT
  USING (is_active = true);

-- RLS policies for challenge_progress
CREATE POLICY "Users can view their own progress"
  ON public.challenge_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
  ON public.challenge_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.challenge_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_monthly_challenges_month ON public.monthly_challenges(month);
CREATE INDEX idx_monthly_challenges_active ON public.monthly_challenges(is_active);
CREATE INDEX idx_challenge_progress_user ON public.challenge_progress(user_id);
CREATE INDEX idx_challenge_progress_challenge ON public.challenge_progress(challenge_id);

-- Insert initial challenges for February 2026 - "Winter Grind"
INSERT INTO public.monthly_challenges (name, description, icon, check_type, threshold, month, reward_points, difficulty, is_active, theme_name) VALUES
('Scoring Surge', 'Score 100 total points this month', '🔥', 'monthly_points', 100, '2026-02', 50, 'medium', true, 'Winter Grind'),
('Board Collector', 'Grab 50 rebounds this month', '📊', 'monthly_rebounds', 50, '2026-02', 40, 'medium', true, 'Winter Grind'),
('3-Point February', 'Make 20 three-pointers this month', '🎯', 'monthly_threes', 20, '2026-02', 60, 'hard', true, 'Winter Grind'),
('Win Streak', 'Win 3 games in a row', '🏆', 'win_streak', 3, '2026-02', 75, 'hard', true, 'Winter Grind'),
('Perfect Game', 'Play a game with 0 turnovers', '✨', 'zero_turnovers', 1, '2026-02', 30, 'easy', true, 'Winter Grind');

-- Pre-seed March 2026 - "March Madness"
INSERT INTO public.monthly_challenges (name, description, icon, check_type, threshold, month, reward_points, difficulty, is_active, theme_name) VALUES
('Bracket Buster', 'Win 5 games this month', '🏀', 'monthly_wins', 5, '2026-03', 60, 'medium', false, 'March Madness'),
('Assist Machine', 'Dish 30 assists this month', '🤝', 'monthly_assists', 30, '2026-03', 50, 'medium', false, 'March Madness'),
('Defensive March', 'Get 25 steals + blocks combined', '🛡️', 'monthly_defensive', 25, '2026-03', 55, 'medium', false, 'March Madness'),
('Hot Shooting', 'Shoot 50%+ FG for the month (min 20 attempts)', '🔥', 'monthly_fg_pct', 50, '2026-03', 70, 'hard', false, 'March Madness'),
('Ironman', 'Log 8+ games this month', '💪', 'monthly_games', 8, '2026-03', 80, 'hard', false, 'March Madness');

-- Pre-seed April 2026 - "Spring Training"
INSERT INTO public.monthly_challenges (name, description, icon, check_type, threshold, month, reward_points, difficulty, is_active, theme_name) VALUES
('Point Guard', 'Average 5+ assists per game (min 3 games)', '🎮', 'monthly_avg_assists', 5, '2026-04', 55, 'medium', false, 'Spring Training'),
('Rebounder', 'Grab 75 rebounds this month', '📈', 'monthly_rebounds', 75, '2026-04', 65, 'hard', false, 'Spring Training'),
('Efficient Scorer', 'Score 80 points on 50%+ shooting', '🎯', 'monthly_efficient_points', 80, '2026-04', 70, 'hard', false, 'Spring Training'),
('Lockdown Month', 'Get 15 steals this month', '🔒', 'monthly_steals', 15, '2026-04', 45, 'medium', false, 'Spring Training'),
('Consistent Player', 'Score 10+ points in 5 games', '⚡', 'games_with_threshold', 5, '2026-04', 60, 'medium', false, 'Spring Training');

-- Trigger for updated_at on challenge_progress
CREATE TRIGGER update_challenge_progress_updated_at
  BEFORE UPDATE ON public.challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();