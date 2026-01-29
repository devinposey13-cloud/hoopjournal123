-- Add storage policy for game photos in avatars bucket
-- Allow authenticated users to upload game photos
CREATE POLICY "Users can upload their own game photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'game-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to update their own game photos
CREATE POLICY "Users can update their own game photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'game-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to delete their own game photos
CREATE POLICY "Users can delete their own game photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'game-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);