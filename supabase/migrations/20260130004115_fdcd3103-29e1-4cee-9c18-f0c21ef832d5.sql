-- Drop existing foreign key constraint on player_milestones.game_id
ALTER TABLE public.player_milestones 
DROP CONSTRAINT IF EXISTS player_milestones_game_id_fkey;

-- Re-add with ON DELETE CASCADE so milestones are deleted when game is deleted
ALTER TABLE public.player_milestones
ADD CONSTRAINT player_milestones_game_id_fkey 
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;