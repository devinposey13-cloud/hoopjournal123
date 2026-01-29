-- Create table to store stats predictions for scheduled games
CREATE TABLE stats_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scheduled_game_id UUID NOT NULL REFERENCES scheduled_games(id) ON DELETE CASCADE,
  predicted_points INTEGER NOT NULL DEFAULT 0,
  predicted_rebounds INTEGER NOT NULL DEFAULT 0,
  predicted_assists INTEGER NOT NULL DEFAULT 0,
  actual_points INTEGER,
  actual_rebounds INTEGER,
  actual_assists INTEGER,
  accuracy_score DECIMAL(5,2),
  points_earned INTEGER DEFAULT 0,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(user_id, scheduled_game_id)
);

-- Enable RLS
ALTER TABLE stats_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own predictions" ON stats_predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions" ON stats_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" ON stats_predictions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" ON stats_predictions
  FOR DELETE USING (auth.uid() = user_id);