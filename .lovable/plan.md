
# Basketball Mini-Games, Achievements & Leaderboards

## Overview

This plan adds 5 basketball-themed mini-games to Hoop Journal, integrated with user profiles, plus a comprehensive achievement and leaderboard system to boost engagement and user retention.

---

## Games to Implement

### 1. Stats Predictor
Predict your performance before your next game, earn points for accuracy.

**How it works:**
- Before a scheduled game, players predict their stats (points, rebounds, assists)
- After logging actual game stats, accuracy is calculated
- Points awarded based on prediction closeness (within 20% = bonus points)

### 2. Free Throw Challenge
Timing-based shooting game with increasing difficulty.

**How it works:**
- Moving power bar - tap to stop at the "sweet spot"
- Consecutive makes increase difficulty (smaller target zone)
- Track streaks and high scores

### 3. Basketball Memory Match
Card-matching game with basketball icons and player stats.

**How it works:**
- Flip cards to match pairs (basketballs, jerseys, stats icons)
- Timed rounds with move counters
- Difficulty levels: 4x4, 6x6, 8x8 grids

### 4. Reaction Time Drill
Test reflexes with rapid-fire basketball scenarios.

**How it works:**
- Random prompts appear (Shoot!, Pass!, Steal!, Block!)
- Tap the correct action as fast as possible
- Track average reaction time and accuracy

### 5. Basketball Trivia
NBA/basketball knowledge quiz.

**How it works:**
- Multiple choice questions about basketball rules, history, legends
- Timed questions (harder = more points)
- Daily trivia challenges

---

## New Navigation Tab

Add a "Games" tab to the navigation bar with a gamepad icon, positioned between "Clips" and "Coach" tabs.

---

## Database Schema

### New Tables

**game_scores** - Track individual game session scores
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Player ID |
| game_type | text | stats_predictor, free_throw, memory_match, reaction_drill, trivia |
| score | integer | Points earned |
| metadata | jsonb | Game-specific data (accuracy %, streak, time, etc.) |
| played_at | timestamptz | When the game was played |

**achievements** - Define available achievements
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Achievement name |
| description | text | How to earn it |
| icon | text | Icon identifier |
| category | text | games, stats, social |
| requirement_type | text | single_game, cumulative, streak |
| requirement_value | integer | Target value to unlock |
| points | integer | Points awarded |

**user_achievements** - Track unlocked achievements per user
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Player ID |
| achievement_id | uuid | FK to achievements |
| unlocked_at | timestamptz | When earned |

**user_game_stats** - Aggregate stats for leaderboards
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Player ID (unique) |
| total_points | integer | Cumulative game points |
| games_played | integer | Total mini-game sessions |
| free_throw_high_score | integer | Best score |
| memory_match_best_time | integer | Fastest completion (seconds) |
| reaction_best_time | integer | Best reaction time (ms) |
| trivia_accuracy | decimal | Percentage correct |
| predictions_made | integer | Stats predictions submitted |
| prediction_accuracy | decimal | Overall accuracy % |
| current_streak | integer | Current daily play streak |
| longest_streak | integer | Best streak ever |
| updated_at | timestamptz | Last update |

---

## Achievement Categories

### Games Achievements
- **First Timer**: Play your first mini-game (10 pts)
- **Sharpshooter**: Score 100+ in Free Throw Challenge (25 pts)
- **Memory Master**: Complete 8x8 Memory Match under 60 seconds (50 pts)
- **Quick Reflexes**: Average reaction time under 300ms (30 pts)
- **Trivia Champion**: Answer 20 questions correctly in a row (40 pts)
- **Prediction Pro**: 5 accurate game predictions in a row (35 pts)

### Stats Achievements (tie into existing game logging)
- **Century Club**: Score 100+ points in a real game (100 pts)
- **Double-Double**: Log a double-double (25 pts)
- **Triple-Double**: Log a triple-double (75 pts)
- **Hot Streak**: Log 3 wins in a row (20 pts)

### Engagement Achievements
- **7-Day Streak**: Play a mini-game 7 days in a row (30 pts)
- **30-Day Warrior**: 30-day mini-game streak (100 pts)
- **Clip Star**: Upload 10 video clips (25 pts)

---

## Leaderboard System

### Leaderboard Views
1. **All-Time Points** - Total points from all games
2. **Weekly Champions** - Points earned this week
3. **Game-Specific** - High scores per mini-game
4. **Achievements** - Most achievements unlocked

### Privacy
- Only show public profile users on leaderboards
- Display username or display name based on settings
- Allow users to opt-out of leaderboards in settings

---

## Component Structure

```text
src/
  components/
    games/
      GamesHub.tsx           # Main games tab container
      GameCard.tsx           # Game selection card
      FreeThrowGame.tsx      # Free throw challenge
      MemoryMatchGame.tsx    # Memory match game
      ReactionDrillGame.tsx  # Reaction time game
      TriviaGame.tsx         # Basketball trivia
      StatsPredictorGame.tsx # Stats prediction
      GameResults.tsx        # Post-game results screen
      AchievementToast.tsx   # Achievement unlock notification
      Leaderboard.tsx        # Leaderboard display
      AchievementsList.tsx   # User achievements view
    ui/
      game-timer.tsx         # Reusable timer component
      score-display.tsx      # Animated score counter
  hooks/
    useGameData.ts           # Games, scores, achievements
    useAchievements.ts       # Achievement tracking logic
    useLeaderboard.ts        # Leaderboard queries
```

---

## Technical Implementation Details

### Free Throw Challenge
- Canvas-based power bar animation
- Increasing difficulty with smaller sweet spot
- Sound effects on make/miss (reuse existing useSoundEffects)

### Memory Match
- React state for card grid and flipped states
- CSS flip animations with 3D transforms
- Basketball-themed card images (ball, jersey, hoop, trophy)

### Reaction Drill
- Random interval timers (1-3 seconds)
- Performance.now() for precise timing
- Color-coded action buttons

### Trivia
- Question bank stored as JSON (50+ questions)
- Categories: Rules, History, Players, Records
- Timer countdown per question

### Stats Predictor
- Form to input predictions before scheduled games
- Automatic comparison when game is logged
- Accuracy calculation with point multipliers

### Sound Effects
- Extend existing useSoundEffects hook with new sounds
- New sounds: countdown beep, correct, incorrect, achievement

### Celebrations
- Reuse FireCelebration component for achievements
- Add confetti animation for high scores

---

## User Flow

1. User navigates to new "Games" tab
2. GamesHub displays 5 game cards with descriptions
3. User selects a game, plays session
4. GameResults shows score, achievements unlocked
5. Scores saved to database, leaderboards updated
6. Achievement toasts appear for any unlocks
7. User can view Leaderboards and personal Achievements from Games tab

---

## Files to Create

| File | Purpose |
|------|---------|
| src/components/games/GamesHub.tsx | Main games container with game selection |
| src/components/games/GameCard.tsx | Clickable game preview card |
| src/components/games/FreeThrowGame.tsx | Free throw challenge game |
| src/components/games/MemoryMatchGame.tsx | Card matching game |
| src/components/games/ReactionDrillGame.tsx | Reaction time game |
| src/components/games/TriviaGame.tsx | Quiz game with questions |
| src/components/games/StatsPredictorGame.tsx | Pre-game prediction form |
| src/components/games/GameResults.tsx | Score summary after game |
| src/components/games/Leaderboard.tsx | Leaderboard display component |
| src/components/games/AchievementsList.tsx | User achievements gallery |
| src/components/games/AchievementToast.tsx | Achievement unlock popup |
| src/hooks/useGameData.ts | Game scores and stats management |
| src/hooks/useAchievements.ts | Achievement tracking logic |
| src/hooks/useLeaderboard.ts | Leaderboard data fetching |
| src/data/triviaQuestions.ts | Basketball trivia question bank |
| src/types/games.ts | Type definitions for games |

---

## Files to Modify

| File | Changes |
|------|---------|
| src/components/Navigation.tsx | Add "Games" tab |
| src/pages/Index.tsx | Add Games tab rendering with GamesHub |
| src/hooks/useSoundEffects.ts | Add new game sound effects |
| src/index.css | Add game-specific animations and styles |
| tailwind.config.ts | Add keyframes for card flip animations |
| src/components/SettingsPanel.tsx | Add leaderboard opt-out toggle |

---

## Database Migration

```sql
-- Create tables for game scores, achievements, and leaderboards

CREATE TABLE game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'games',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE user_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  free_throw_high_score INTEGER DEFAULT 0,
  memory_match_best_time INTEGER,
  reaction_best_time INTEGER,
  trivia_accuracy DECIMAL(5,2) DEFAULT 0,
  predictions_made INTEGER DEFAULT 0,
  prediction_accuracy DECIMAL(5,2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_scores
CREATE POLICY "Users can view their own scores" ON game_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own scores" ON game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anyone can view achievements definitions
CREATE POLICY "Anyone can view achievements" ON achievements
  FOR SELECT USING (true);

-- RLS for user_achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS for user_game_stats (allow leaderboard viewing for public profiles)
CREATE POLICY "Users can view their own stats" ON user_game_stats
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view stats of public profiles" ON user_game_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_settings ps 
      WHERE ps.user_id = user_game_stats.user_id 
      AND ps.is_profile_public = true
    )
  );
CREATE POLICY "Users can insert their own stats" ON user_game_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stats" ON user_game_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points) VALUES
('First Timer', 'Play your first mini-game', 'gamepad', 'games', 'single_game', 1, 10),
('Sharpshooter', 'Score 100+ in Free Throw Challenge', 'target', 'games', 'single_game', 100, 25),
('Memory Master', 'Complete 8x8 Memory Match in under 60 seconds', 'brain', 'games', 'single_game', 60, 50),
('Quick Reflexes', 'Average reaction time under 300ms', 'zap', 'games', 'single_game', 300, 30),
('Trivia Champion', 'Answer 20 questions correctly in a row', 'trophy', 'games', 'streak', 20, 40),
('Prediction Pro', '5 accurate game predictions in a row', 'trending-up', 'games', 'streak', 5, 35),
('7-Day Streak', 'Play a mini-game 7 days in a row', 'flame', 'engagement', 'streak', 7, 30),
('30-Day Warrior', '30-day mini-game streak', 'medal', 'engagement', 'streak', 30, 100),
('Double-Double', 'Log a double-double in a real game', 'star', 'stats', 'single_game', 1, 25),
('Triple-Double', 'Log a triple-double in a real game', 'stars', 'stats', 'single_game', 1, 75);

-- Create updated_at trigger for user_game_stats
CREATE TRIGGER update_user_game_stats_updated_at
  BEFORE UPDATE ON user_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Implementation Order

1. **Phase 1: Database & Infrastructure**
   - Create database tables and RLS policies
   - Create types and base hooks (useGameData, useAchievements)
   - Add Games tab to navigation

2. **Phase 2: Games Hub & First Game**
   - Build GamesHub component with game cards
   - Implement Free Throw Challenge (simplest game)
   - Add GameResults component

3. **Phase 3: Remaining Games**
   - Memory Match game
   - Reaction Drill game
   - Basketball Trivia game
   - Stats Predictor (integrates with scheduled games)

4. **Phase 4: Achievements & Leaderboards**
   - Achievement tracking and unlock logic
   - Achievement toast notifications
   - Leaderboard component and queries

5. **Phase 5: Polish**
   - Sound effects for games
   - Animations and celebrations
   - Settings for leaderboard privacy
