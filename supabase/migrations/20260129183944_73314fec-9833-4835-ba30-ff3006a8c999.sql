-- Add phone column to player_settings table for storing user phone numbers
ALTER TABLE public.player_settings 
ADD COLUMN phone text;