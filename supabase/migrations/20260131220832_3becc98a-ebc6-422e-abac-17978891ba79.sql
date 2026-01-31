-- Add halftime and final score columns to games table
ALTER TABLE public.games 
ADD COLUMN halftime_score_us integer DEFAULT NULL,
ADD COLUMN halftime_score_them integer DEFAULT NULL,
ADD COLUMN final_score_us integer DEFAULT NULL,
ADD COLUMN final_score_them integer DEFAULT NULL;