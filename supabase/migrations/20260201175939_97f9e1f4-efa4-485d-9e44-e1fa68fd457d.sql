-- Add coach voice gender preference to player_settings
ALTER TABLE public.player_settings 
ADD COLUMN coach_voice_gender text NOT NULL DEFAULT 'male';