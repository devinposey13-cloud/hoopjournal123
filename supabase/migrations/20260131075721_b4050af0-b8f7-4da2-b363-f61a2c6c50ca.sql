-- Insert new creative milestone definitions

-- ========================
-- EFFICIENCY & SMART PLAY (Single-Game)
-- ========================

INSERT INTO milestone_definitions (name, description, icon, category, rarity, check_type, threshold, secondary_threshold, is_repeatable) VALUES
  ('Turnover-Free Zone', 'Play 20+ minutes with 0 turnovers', '🔒', 'single_game', 'uncommon', 'zero_to_minutes', 20, NULL, true),
  ('Ball Security', '5+ assists with 0 turnovers', '🔐', 'single_game', 'rare', 'ast_zero_to', 5, NULL, true),
  ('Floor General', 'Dish out 8+ assists in a single game', '🎖️', 'single_game', 'rare', 'assists_gte', 8, NULL, true),
  ('Facilitator', 'More assists than field goal attempts', '🤝', 'single_game', 'epic', 'ast_gt_fga', 1, NULL, true),
  ('Efficient Engine', 'Score 15+ points on 60%+ shooting', '⚙️', 'single_game', 'rare', 'efficient_high_scorer', 15, 60, true),
  ('Perfect Touch', '100% from the line with 5+ attempts', '🎯', 'single_game', 'rare', 'perfect_ft', 5, NULL, true);

-- ========================
-- DEFENSIVE EXCELLENCE (Single-Game)
-- ========================

INSERT INTO milestone_definitions (name, description, icon, category, rarity, check_type, threshold, secondary_threshold, is_repeatable) VALUES
  ('Lockdown Defender', '3+ steals AND 2+ blocks in a game', '🛡️', 'single_game', 'epic', 'combined_defensive', 3, 2, true),
  ('Pickpocket', 'Swipe 5+ steals in a single game', '👋', 'single_game', 'rare', 'steals_gte', 5, NULL, true),
  ('Rim Protector', 'Swat away 4+ blocks in a game', '🖐️', 'single_game', 'epic', 'blocks_gte', 4, NULL, true),
  ('Glass Cleaner', 'Grab 15+ rebounds in a game', '🧹', 'single_game', 'epic', 'rebounds_gte', 15, NULL, true),
  ('Pest', '4+ steals in a winning effort', '🐝', 'single_game', 'rare', 'steals_in_win', 4, NULL, true);

-- ========================
-- RARE ACHIEVEMENTS (Single-Game)
-- ========================

INSERT INTO milestone_definitions (name, description, icon, category, rarity, check_type, threshold, secondary_threshold, is_repeatable) VALUES
  ('30-Point Explosion', 'Erupt for 30+ points in a single game', '💥', 'single_game', 'epic', 'points_gte', 30, NULL, true),
  ('40-Point Eruption', 'Go nuclear with 40+ points', '🌋', 'single_game', 'legendary', 'points_gte', 40, NULL, true),
  ('5x5', '5+ in all 5 major stat categories', '🖐️', 'single_game', 'legendary', 'five_by_five', 5, NULL, true),
  ('20-20 Club', '20+ points AND 20+ rebounds', '👑', 'single_game', 'legendary', 'twenty_twenty', 20, NULL, true),
  ('Triple-Threat', '20+ pts, 5+ reb, 5+ ast in one game', '⚡', 'single_game', 'rare', 'triple_threat', 20, NULL, true),
  ('Ice in Veins', '90%+ FT in a win with 4+ attempts', '🧊', 'single_game', 'rare', 'clutch_ft', 90, 4, true);

-- ========================
-- STREAK & CONSISTENCY (Multi-Game)
-- ========================

INSERT INTO milestone_definitions (name, description, icon, category, rarity, check_type, threshold, secondary_threshold, is_repeatable) VALUES
  ('Rebound Streak', '8+ rebounds in 3 consecutive games', '📈', 'multi_game', 'rare', 'rebound_streak', 8, 3, false),
  ('Defensive Streak', '2+ steals in 5 straight games', '🔥', 'multi_game', 'epic', 'steal_streak', 2, 5, false),
  ('Double-Double Streak', 'Double-double in 3 straight games', '💪', 'multi_game', 'legendary', 'double_double_streak', 2, 3, false),
  ('Consistency King', '10+ pts, 5+ reb, 3+ ast in 5 straight', '👑', 'multi_game', 'legendary', 'consistency_streak', 10, 5, false),
  ('Hot Hand', '3+ threes in 3 consecutive games', '🔥', 'multi_game', 'rare', 'three_streak', 3, 3, false),
  ('Iron Will', 'Play 20+ minutes in 10 straight games', '🦾', 'multi_game', 'epic', 'minutes_streak', 20, 10, false);

-- ========================
-- SEASON CUMULATIVE (Season)
-- ========================

INSERT INTO milestone_definitions (name, description, icon, category, rarity, check_type, threshold, secondary_threshold, is_repeatable) VALUES
  ('Century Club', 'Grab 100 total rebounds in a season', '💯', 'season', 'rare', 'season_rebounds', 100, NULL, false),
  ('Assist Master', 'Dish 100 assists in a season', '🎯', 'season', 'epic', 'season_assists', 100, NULL, false),
  ('Swiper', 'Collect 50 steals in a season', '🦊', 'season', 'rare', 'season_steals', 50, NULL, false),
  ('Shot Blocker', 'Block 25 shots in a season', '🚫', 'season', 'rare', 'season_blocks', 25, NULL, false),
  ('Sharpshooter Season', 'Drain 50 three-pointers in a season', '🏹', 'season', 'uncommon', 'season_threes', 50, NULL, false),
  ('1000 Point Season', 'Score 1000 points in a single season', '🏆', 'season', 'legendary', 'season_points', 1000, NULL, false);