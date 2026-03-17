
-- Add lifetime games counter to plan_overrides
ALTER TABLE public.plan_overrides ADD COLUMN IF NOT EXISTS lifetime_games_logged integer NOT NULL DEFAULT 0;

-- Create trigger function to increment lifetime_games_logged on game insert
CREATE OR REPLACE FUNCTION public.increment_lifetime_games()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.plan_overrides (user_id, lifetime_games_logged)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET lifetime_games_logged = plan_overrides.lifetime_games_logged + 1;
  RETURN NEW;
END;
$$;

-- Create trigger on games table
DROP TRIGGER IF EXISTS on_game_insert_increment_lifetime ON public.games;
CREATE TRIGGER on_game_insert_increment_lifetime
  AFTER INSERT ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_lifetime_games();

-- Backfill existing users: count their current games
UPDATE public.plan_overrides po
SET lifetime_games_logged = COALESCE((
  SELECT COUNT(*) FROM public.games g WHERE g.user_id = po.user_id
), 0);
