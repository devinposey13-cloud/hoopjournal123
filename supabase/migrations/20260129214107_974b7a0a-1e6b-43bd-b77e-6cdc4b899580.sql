-- Add is_repeatable column to milestone_definitions
ALTER TABLE public.milestone_definitions 
ADD COLUMN IF NOT EXISTS is_repeatable boolean NOT NULL DEFAULT false;

-- Update existing milestones to be repeatable (single-game achievements should be repeatable)
UPDATE public.milestone_definitions SET is_repeatable = true WHERE category = 'single_game';

-- Add more milestone definitions with varying difficulty

-- COMMON - Easy to achieve, encouraging for beginners
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, is_repeatable) VALUES
  ('First Bucket', 'Score at least 1 point in a game', 'single_game', 'common', 'Circle', 'points_gte', 1, true),
  ('First Dime', 'Record at least 1 assist in a game', 'single_game', 'common', 'Users', 'assists_gte', 1, true),
  ('Board Getter', 'Grab at least 1 rebound in a game', 'single_game', 'common', 'ArrowUp', 'rebounds_gte', 1, true),
  ('Active Hands', 'Get at least 1 steal in a game', 'single_game', 'common', 'Eye', 'steals_gte', 1, true),
  ('Wall Up', 'Block at least 1 shot in a game', 'single_game', 'common', 'Hand', 'blocks_gte', 1, true),
  ('5 Points', 'Score 5+ points in a game', 'single_game', 'common', 'Star', 'points_gte', 5, true),
  ('Contributor', 'Record 3+ assists in a game', 'single_game', 'common', 'Users', 'assists_gte', 3, true)
ON CONFLICT DO NOTHING;

-- UNCOMMON - Solid performance milestones
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, is_repeatable) VALUES
  ('Double Digit Scorer', 'Score 10+ points in a game', 'single_game', 'uncommon', 'Flame', 'points_gte', 10, true),
  ('Board Collector', 'Grab 5+ rebounds in a game', 'single_game', 'uncommon', 'ArrowUp', 'rebounds_gte', 5, true),
  ('Floor General', 'Dish out 5+ assists in a game', 'single_game', 'uncommon', 'Users', 'assists_gte', 5, true),
  ('Pickpocket', 'Record 2+ steals in a game', 'single_game', 'uncommon', 'Eye', 'steals_gte', 2, true),
  ('Rim Protector', 'Block 2+ shots in a game', 'single_game', 'uncommon', 'Shield', 'blocks_gte', 2, true),
  ('Long Range', '1+ three-pointer made in a game', 'single_game', 'uncommon', 'Target', 'three_pt_made_gte', 1, true),
  ('Clean Sheet', 'Zero turnovers in a game', 'single_game', 'uncommon', 'CheckCircle', 'zero_turnovers', 0, true)
ON CONFLICT DO NOTHING;

-- RARE - Great game performance
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, is_repeatable) VALUES
  ('15 Piece', 'Score 15+ points in a game', 'single_game', 'rare', 'Flame', 'points_gte', 15, true),
  ('Dime Dealer', 'Record 8+ assists in a game', 'single_game', 'rare', 'Users', 'assists_gte', 8, true),
  ('Glass Cleaner', 'Grab 8+ rebounds in a game', 'single_game', 'rare', 'ArrowUp', 'rebounds_gte', 8, true),
  ('Thief in the Night', 'Record 4+ steals in a game', 'single_game', 'rare', 'Eye', 'steals_gte', 4, true),
  ('Shot Swatter', 'Block 4+ shots in a game', 'single_game', 'rare', 'Hand', 'blocks_gte', 4, true),
  ('Deep Threat', 'Make 3+ three-pointers in a game', 'single_game', 'rare', 'Target', 'three_pt_made_gte', 3, true),
  ('Perfect Shooting Night', 'Go 100% from the field with 5+ FG made', 'single_game', 'rare', 'Circle', 'perfect_fg', 5, true)
ON CONFLICT DO NOTHING;

-- EPIC - Outstanding performance
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, is_repeatable) VALUES
  ('25 Burger', 'Score 25+ points in a game', 'single_game', 'epic', 'Flame', 'points_gte', 25, true),
  ('Dime Machine', 'Record 10+ assists in a game', 'single_game', 'epic', 'Users', 'assists_gte', 10, true),
  ('Glass Dominator', 'Grab 12+ rebounds in a game', 'single_game', 'epic', 'ArrowUp', 'rebounds_gte', 12, true),
  ('Defensive Nightmare', 'Record 5+ steals in a game', 'single_game', 'epic', 'Eye', 'steals_gte', 5, true),
  ('Block Party Host', 'Block 5+ shots in a game', 'single_game', 'epic', 'Hand', 'blocks_gte', 5, true),
  ('Sniper Mode', 'Make 4+ three-pointers in a game', 'single_game', 'epic', 'Target', 'three_pt_made_gte', 4, true),
  ('Free Throw Machine', 'Make 8+ free throws at 90%+ from the line', 'single_game', 'epic', 'Circle', 'ft_master', 8, true),
  ('Double-Double King', 'Record 15+ in two stat categories', 'single_game', 'epic', 'Crown', 'high_double_double', 15, true)
ON CONFLICT DO NOTHING;

-- LEGENDARY - Elite performance (very hard to achieve)
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, is_repeatable) VALUES
  ('30 Bomb', 'Score 30+ points in a game', 'single_game', 'legendary', 'Flame', 'points_gte', 30, true),
  ('Quadruple-Double', '10+ in four stat categories', 'single_game', 'legendary', 'Crown', 'quadruple_double', 4, true),
  ('Perfect Game', '15+ points, 60%+ FG, 0 turnovers, and a win', 'single_game', 'legendary', 'Star', 'perfect_game', 15, true),
  ('Splash Zone', 'Make 5+ three-pointers in a game', 'single_game', 'legendary', 'Target', 'three_pt_made_gte', 5, true),
  ('Defensive MVP', '5+ steals AND 3+ blocks in one game', 'single_game', 'legendary', 'Shield', 'defensive_monster', 5, true),
  ('All-Around Beast', '10+ points, 10+ rebounds, 5+ assists, 2+ steals, 2+ blocks', 'single_game', 'legendary', 'Crown', 'all_around', 10, true),
  ('40 Point Explosion', 'Score 40+ points in a game', 'single_game', 'legendary', 'Flame', 'points_gte', 40, true)
ON CONFLICT DO NOTHING;

-- STREAK MILESTONES (multi_game)
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, secondary_threshold, is_repeatable) VALUES
  ('Scoring Streak', 'Score 10+ points in 3 consecutive games', 'multi_game', 'rare', 'TrendingUp', 'scoring_streak', 10, 3, false),
  ('Win Streak Master', 'Win 5 games in a row', 'multi_game', 'epic', 'Trophy', 'win_streak', 5, null, false),
  ('Undefeated Month', 'Win 8 games in a row', 'multi_game', 'legendary', 'Trophy', 'win_streak', 8, null, false),
  ('Assist Consistency', '3+ assists in 5 consecutive games', 'multi_game', 'rare', 'Users', 'assist_streak', 3, 5, false),
  ('Points Machine', 'Score 15+ points in 3 consecutive games', 'multi_game', 'epic', 'Flame', 'scoring_streak', 15, 3, false),
  ('10 Game Warrior', 'Play 10 games in a season', 'multi_game', 'uncommon', 'Medal', 'games_played', 10, null, false),
  ('15 Game Veteran', 'Play 15 games in a season', 'multi_game', 'rare', 'Medal', 'games_played', 15, null, false),
  ('20 Game Legend', 'Play 20 games in a season', 'multi_game', 'epic', 'Medal', 'games_played', 20, null, false)
ON CONFLICT DO NOTHING;

-- SEASON CUMULATIVE MILESTONES
INSERT INTO public.milestone_definitions (name, description, category, rarity, icon, check_type, threshold, is_repeatable) VALUES
  ('50 Point Season', 'Score 50 total points in a season', 'season', 'common', 'Star', 'season_points', 50, false),
  ('250 Point Season', 'Score 250 total points in a season', 'season', 'rare', 'Star', 'season_points', 250, false),
  ('500 Point Season', 'Score 500 total points in a season', 'season', 'epic', 'Star', 'season_points', 500, false),
  ('1000 Point Season', 'Score 1000 total points in a season', 'season', 'legendary', 'Star', 'season_points', 1000, false),
  ('25 Rebounds', 'Grab 25 total rebounds in a season', 'season', 'common', 'ArrowUp', 'season_rebounds', 25, false),
  ('100 Rebounds', 'Grab 100 total rebounds in a season', 'season', 'uncommon', 'ArrowUp', 'season_rebounds', 100, false),
  ('200 Rebounds', 'Grab 200 total rebounds in a season', 'season', 'rare', 'ArrowUp', 'season_rebounds', 200, false),
  ('25 Assists', 'Dish 25 total assists in a season', 'season', 'common', 'Users', 'season_assists', 25, false),
  ('100 Assists', 'Dish 100 total assists in a season', 'season', 'rare', 'Users', 'season_assists', 100, false),
  ('200 Assists', 'Dish 200 total assists in a season', 'season', 'epic', 'Users', 'season_assists', 200, false),
  ('10 Steals', 'Record 10 total steals in a season', 'season', 'common', 'Eye', 'season_steals', 10, false),
  ('50 Steals', 'Record 50 total steals in a season', 'season', 'rare', 'Eye', 'season_steals', 50, false),
  ('100 Steals', 'Record 100 total steals in a season', 'season', 'legendary', 'Eye', 'season_steals', 100, false),
  ('10 Blocks', 'Record 10 total blocks in a season', 'season', 'uncommon', 'Shield', 'season_blocks', 10, false),
  ('25 Threes Season', 'Make 25 three-pointers in a season', 'season', 'uncommon', 'Target', 'season_threes', 25, false),
  ('100 Threes Season', 'Make 100 three-pointers in a season', 'season', 'epic', 'Target', 'season_threes', 100, false)
ON CONFLICT DO NOTHING;