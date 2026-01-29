-- Add fouls column to games table
ALTER TABLE games 
ADD COLUMN fouls integer NOT NULL DEFAULT 0;