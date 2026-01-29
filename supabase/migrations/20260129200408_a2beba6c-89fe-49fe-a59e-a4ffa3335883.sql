-- Add theme music URL field to player_settings
ALTER TABLE public.player_settings 
ADD COLUMN theme_music_url text;