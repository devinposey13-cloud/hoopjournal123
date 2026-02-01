-- Add ring of honor opt-in column to player_settings
ALTER TABLE public.player_settings 
ADD COLUMN ring_of_honor_opt_in boolean NOT NULL DEFAULT false;