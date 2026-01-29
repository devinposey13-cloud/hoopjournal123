-- Update default values for player_settings table
ALTER TABLE public.player_settings 
  ALTER COLUMN number SET DEFAULT 0,
  ALTER COLUMN grade SET DEFAULT '1st Grade';