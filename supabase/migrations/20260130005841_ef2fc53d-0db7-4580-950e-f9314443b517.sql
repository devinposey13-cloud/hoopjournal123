-- Add tournament column to scheduled_games table
ALTER TABLE scheduled_games
ADD COLUMN tournament text DEFAULT NULL;