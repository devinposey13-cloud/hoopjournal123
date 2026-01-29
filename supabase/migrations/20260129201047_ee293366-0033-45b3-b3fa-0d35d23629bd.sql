-- Add missing username column to player_settings
ALTER TABLE public.player_settings 
ADD COLUMN username text UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_player_settings_username ON public.player_settings(username);