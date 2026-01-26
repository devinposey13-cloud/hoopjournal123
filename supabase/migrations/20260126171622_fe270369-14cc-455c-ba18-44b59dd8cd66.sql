-- Create video_likes table
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.video_clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Create video_comments table
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.video_clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_video_likes_video_id ON public.video_likes(video_id);
CREATE INDEX idx_video_likes_user_id ON public.video_likes(user_id);
CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX idx_video_comments_user_id ON public.video_comments(user_id);

-- RLS Policies for video_likes
-- Users can like public videos
CREATE POLICY "Users can like public videos"
ON public.video_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.video_clips
    WHERE id = video_id AND is_public = true
  )
);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can unlike videos"
ON public.video_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can view likes on public videos
CREATE POLICY "Anyone can view likes on public videos"
ON public.video_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.video_clips
    WHERE id = video_id AND is_public = true
  )
);

-- RLS Policies for video_comments
-- Users can comment on public videos
CREATE POLICY "Users can comment on public videos"
ON public.video_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.video_clips
    WHERE id = video_id AND is_public = true
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON public.video_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.video_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Anyone can view comments on public videos
CREATE POLICY "Anyone can view comments on public videos"
ON public.video_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.video_clips
    WHERE id = video_id AND is_public = true
  )
);

-- Create trigger for updated_at on comments
CREATE TRIGGER update_video_comments_updated_at
BEFORE UPDATE ON public.video_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();