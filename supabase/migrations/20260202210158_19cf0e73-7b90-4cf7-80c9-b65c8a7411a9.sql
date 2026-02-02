-- Drop the unique constraint on user_id to allow multiple profiles per user
ALTER TABLE public.player_settings DROP CONSTRAINT IF EXISTS player_settings_user_id_key;

-- Create an index on user_id for performance (since it's no longer unique)
CREATE INDEX IF NOT EXISTS idx_player_settings_user_id ON public.player_settings(user_id);

-- Add a comment explaining the multi-profile design
COMMENT ON TABLE public.player_settings IS 'Player profiles - each user can have multiple profiles (e.g., for different children). The is_active_profile column indicates which profile is currently selected.';