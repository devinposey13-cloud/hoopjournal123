-- Add avatar_skipped_at column to track when user dismissed the avatar upload prompt
ALTER TABLE public.player_settings 
ADD COLUMN avatar_skipped_at timestamp with time zone DEFAULT null;