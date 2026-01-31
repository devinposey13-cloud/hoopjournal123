-- Add column for player to receive their own game summaries via email
ALTER TABLE public.player_settings
ADD COLUMN receive_game_summaries boolean NOT NULL DEFAULT false;