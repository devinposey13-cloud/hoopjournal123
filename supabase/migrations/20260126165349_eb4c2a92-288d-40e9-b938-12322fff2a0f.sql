-- Add is_public column to video_clips table
ALTER TABLE public.video_clips 
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Create index for efficient public clips queries
CREATE INDEX idx_video_clips_public ON public.video_clips(is_public) WHERE is_public = true;

-- Add RLS policy to allow viewing public clips from any user
CREATE POLICY "Anyone can view public clips"
ON public.video_clips
FOR SELECT
USING (is_public = true);