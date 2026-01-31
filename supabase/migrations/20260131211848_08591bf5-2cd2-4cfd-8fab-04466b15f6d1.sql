-- Add team_id column to scheduled_games for multi-team filtering
ALTER TABLE public.scheduled_games
ADD COLUMN team_id UUID REFERENCES public.player_teams(id) ON DELETE SET NULL;

-- Create an index for efficient team filtering
CREATE INDEX idx_scheduled_games_team_id ON public.scheduled_games(team_id);