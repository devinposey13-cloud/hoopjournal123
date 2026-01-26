-- Allow public access to read video files for public clips
CREATE POLICY "Anyone can view public clip files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'video-clips' 
  AND EXISTS (
    SELECT 1 FROM public.video_clips 
    WHERE file_path = name 
    AND is_public = true
  )
);