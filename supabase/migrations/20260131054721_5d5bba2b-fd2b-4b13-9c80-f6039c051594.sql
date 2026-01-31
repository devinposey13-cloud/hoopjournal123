-- Add onboarding-related columns to player_settings
ALTER TABLE player_settings
ADD COLUMN IF NOT EXISTS court_role TEXT,
ADD COLUMN IF NOT EXISTS playing_level TEXT,
ADD COLUMN IF NOT EXISTS season_goals TEXT[],
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;