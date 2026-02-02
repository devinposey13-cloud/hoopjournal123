-- Multi-Profile Support Migration
-- This adds profile_id to all player data tables while preserving backward compatibility

-- Step 1: Add profile_id column to player_settings (self-referencing for future multi-profile)
-- Each player_settings row IS a profile. We need to track which profile is "active" per account.
ALTER TABLE public.player_settings 
ADD COLUMN IF NOT EXISTS is_active_profile boolean NOT NULL DEFAULT true;

-- Step 2: Add profile_id (references player_settings.id) to all player data tables
-- Games
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Scheduled Games
ALTER TABLE public.scheduled_games 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Video Clips
ALTER TABLE public.video_clips 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Player Milestones
ALTER TABLE public.player_milestones 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Player Badges
ALTER TABLE public.player_badges 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Player XP Progress
ALTER TABLE public.player_xp_progress 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Player XP History
ALTER TABLE public.player_xp_history 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Player Tier Achievements
ALTER TABLE public.player_tier_achievements 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Postgame Insights
ALTER TABLE public.postgame_insights 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Coach Memory
ALTER TABLE public.coach_memory 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Challenge Progress
ALTER TABLE public.challenge_progress 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Stats Predictions
ALTER TABLE public.stats_predictions 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Player Teams (per-profile as requested)
ALTER TABLE public.player_teams 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Seasons (per-profile as requested)
ALTER TABLE public.seasons 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.player_settings(id) ON DELETE CASCADE;

-- Step 3: Backfill profile_id for existing data
-- For each user, their existing player_settings.id becomes the profile_id for all their data

-- Update games
UPDATE public.games g
SET profile_id = ps.id
FROM public.player_settings ps
WHERE g.user_id = ps.user_id AND g.profile_id IS NULL;

-- Update scheduled_games
UPDATE public.scheduled_games sg
SET profile_id = ps.id
FROM public.player_settings ps
WHERE sg.user_id = ps.user_id AND sg.profile_id IS NULL;

-- Update video_clips
UPDATE public.video_clips vc
SET profile_id = ps.id
FROM public.player_settings ps
WHERE vc.user_id = ps.user_id AND vc.profile_id IS NULL;

-- Update player_milestones
UPDATE public.player_milestones pm
SET profile_id = ps.id
FROM public.player_settings ps
WHERE pm.user_id = ps.user_id AND pm.profile_id IS NULL;

-- Update player_badges
UPDATE public.player_badges pb
SET profile_id = ps.id
FROM public.player_settings ps
WHERE pb.user_id = ps.user_id AND pb.profile_id IS NULL;

-- Update player_xp_progress
UPDATE public.player_xp_progress pxp
SET profile_id = ps.id
FROM public.player_settings ps
WHERE pxp.user_id = ps.user_id AND pxp.profile_id IS NULL;

-- Update player_xp_history
UPDATE public.player_xp_history pxh
SET profile_id = ps.id
FROM public.player_settings ps
WHERE pxh.user_id = ps.user_id AND pxh.profile_id IS NULL;

-- Update player_tier_achievements
UPDATE public.player_tier_achievements pta
SET profile_id = ps.id
FROM public.player_settings ps
WHERE pta.user_id = ps.user_id AND pta.profile_id IS NULL;

-- Update postgame_insights
UPDATE public.postgame_insights pi
SET profile_id = ps.id
FROM public.player_settings ps
WHERE pi.user_id = ps.user_id AND pi.profile_id IS NULL;

-- Update coach_memory
UPDATE public.coach_memory cm
SET profile_id = ps.id
FROM public.player_settings ps
WHERE cm.user_id = ps.user_id AND cm.profile_id IS NULL;

-- Update challenge_progress
UPDATE public.challenge_progress cp
SET profile_id = ps.id
FROM public.player_settings ps
WHERE cp.user_id = ps.user_id AND cp.profile_id IS NULL;

-- Update stats_predictions
UPDATE public.stats_predictions sp
SET profile_id = ps.id
FROM public.player_settings ps
WHERE sp.user_id = ps.user_id AND sp.profile_id IS NULL;

-- Update player_teams
UPDATE public.player_teams pt
SET profile_id = ps.id
FROM public.player_settings ps
WHERE pt.user_id = ps.user_id AND pt.profile_id IS NULL;

-- Update seasons
UPDATE public.seasons s
SET profile_id = ps.id
FROM public.player_settings ps
WHERE s.user_id = ps.user_id AND s.profile_id IS NULL;

-- Step 4: Create indexes for profile_id columns for query performance
CREATE INDEX IF NOT EXISTS idx_games_profile_id ON public.games(profile_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_games_profile_id ON public.scheduled_games(profile_id);
CREATE INDEX IF NOT EXISTS idx_video_clips_profile_id ON public.video_clips(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_milestones_profile_id ON public.player_milestones(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_badges_profile_id ON public.player_badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_xp_progress_profile_id ON public.player_xp_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_xp_history_profile_id ON public.player_xp_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_tier_achievements_profile_id ON public.player_tier_achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_postgame_insights_profile_id ON public.postgame_insights(profile_id);
CREATE INDEX IF NOT EXISTS idx_coach_memory_profile_id ON public.coach_memory(profile_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_profile_id ON public.challenge_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_stats_predictions_profile_id ON public.stats_predictions(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_profile_id ON public.player_teams(profile_id);
CREATE INDEX IF NOT EXISTS idx_seasons_profile_id ON public.seasons(profile_id);

-- Step 5: Add constraint to ensure only one active profile per user
-- Using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_profile_per_user 
ON public.player_settings(user_id) 
WHERE is_active_profile = true;

-- Step 6: Add RLS policies for profile access
-- Users can view profiles they own
CREATE POLICY "Users can view their own profiles" 
ON public.player_settings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Step 7: Add comment documenting the multi-profile architecture
COMMENT ON COLUMN public.player_settings.is_active_profile IS 
'Indicates if this is the currently active profile for the user. Only one profile per user can be active at a time.';

COMMENT ON TABLE public.player_settings IS 
'Player profiles. Each account (user) can have multiple profiles (e.g., for parents managing multiple kids). All player data is scoped to a profile_id.';