-- Add display_name column to player_settings for privacy when commenting
ALTER TABLE public.player_settings 
ADD COLUMN display_name TEXT;

-- Add comment explaining purpose
COMMENT ON COLUMN public.player_settings.display_name IS 'Public display name shown on comments instead of real name';