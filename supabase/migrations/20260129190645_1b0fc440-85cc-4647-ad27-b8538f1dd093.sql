-- Create tables for game scores, achievements, and leaderboards

CREATE TABLE game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'games',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE user_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  free_throw_high_score INTEGER DEFAULT 0,
  memory_match_best_time INTEGER,
  reaction_best_time INTEGER,
  trivia_accuracy DECIMAL(5,2) DEFAULT 0,
  predictions_made INTEGER DEFAULT 0,
  prediction_accuracy DECIMAL(5,2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_scores
CREATE POLICY "Users can view their own scores" ON game_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own scores" ON game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anyone can view achievements definitions
CREATE POLICY "Anyone can view achievements" ON achievements
  FOR SELECT USING (true);

-- RLS for user_achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view achievements of public profiles" ON user_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_settings ps 
      WHERE ps.user_id = user_achievements.user_id 
      AND ps.is_profile_public = true
    )
  );

-- RLS for user_game_stats (allow leaderboard viewing for public profiles)
CREATE POLICY "Users can view their own stats" ON user_game_stats
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view stats of public profiles" ON user_game_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_settings ps 
      WHERE ps.user_id = user_game_stats.user_id 
      AND ps.is_profile_public = true
    )
  );
CREATE POLICY "Users can insert their own stats" ON user_game_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stats" ON user_game_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points) VALUES
('First Timer', 'Play your first mini-game', 'gamepad', 'games', 'single_game', 1, 10),
('Sharpshooter', 'Score 100+ in Free Throw Challenge', 'target', 'games', 'single_game', 100, 25),
('Memory Master', 'Complete 8x8 Memory Match in under 60 seconds', 'brain', 'games', 'single_game', 60, 50),
('Quick Reflexes', 'Average reaction time under 300ms', 'zap', 'games', 'single_game', 300, 30),
('Trivia Champion', 'Answer 20 questions correctly in a row', 'trophy', 'games', 'streak', 20, 40),
('Prediction Pro', '5 accurate game predictions in a row', 'trending-up', 'games', 'streak', 5, 35),
('7-Day Streak', 'Play a mini-game 7 days in a row', 'flame', 'engagement', 'streak', 7, 30),
('30-Day Warrior', '30-day mini-game streak', 'medal', 'engagement', 'streak', 30, 100),
('Double-Double', 'Log a double-double in a real game', 'star', 'stats', 'single_game', 1, 25),
('Triple-Double', 'Log a triple-double in a real game', 'stars', 'stats', 'single_game', 1, 75);

-- Create updated_at trigger for user_game_stats
CREATE TRIGGER update_user_game_stats_updated_at
  BEFORE UPDATE ON user_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();