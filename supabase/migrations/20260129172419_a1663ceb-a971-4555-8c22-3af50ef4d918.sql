-- Add game_photo_url column to store game day photos
ALTER TABLE public.games 
ADD COLUMN game_photo_url TEXT;