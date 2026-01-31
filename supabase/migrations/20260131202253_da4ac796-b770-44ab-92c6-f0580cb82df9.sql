-- Create player_teams table for multi-team support
CREATE TABLE public.player_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add team_id column to games table
ALTER TABLE public.games ADD COLUMN team_id uuid REFERENCES public.player_teams(id) ON DELETE SET NULL;

-- Enable RLS on player_teams
ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_teams
CREATE POLICY "Users can view their own teams"
ON public.player_teams FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own teams"
ON public.player_teams FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams"
ON public.player_teams FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams"
ON public.player_teams FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_player_teams_user_id ON public.player_teams(user_id);
CREATE INDEX idx_games_team_id ON public.games(team_id);