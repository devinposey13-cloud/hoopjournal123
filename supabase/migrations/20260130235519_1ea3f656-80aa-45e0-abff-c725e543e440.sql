-- Auto-approve existing users who were created before the approval system
-- or who have already recorded games (proving they are active users)
UPDATE player_settings 
SET is_approved = true 
WHERE 
  -- Created before approval system was implemented
  created_at < '2026-01-30' 
  OR 
  -- Has recorded games (active users)
  user_id IN (SELECT DISTINCT user_id FROM games);