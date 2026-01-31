
# Post-Game Performance Scoring & XP/Level System

## Overview
This plan implements a comprehensive 2K-inspired progression system where players earn XP after each logged game based on their performance. XP accumulates toward 50 levels per calendar quarter (Q1-Q4), with fresh resets at the start of each quarter to keep competition engaging.

---

## What You'll Experience

### After Logging a Game
- Animated performance score breakdown showing how each stat contributed
- XP earned displayed with a satisfying fill animation
- Level-up celebration with 2K-style visual effects when reaching a new level
- Clear progress bar showing XP remaining until next level

### On Your Dashboard  
- Current level badge prominently displayed (Level 1-50)
- XP progress bar showing progress to next level
- Quarterly countdown showing days left in current season
- Peak level from previous quarters shown as career achievements

### In the Games Hub
- New "Season Progress" tab showing quarterly leaderboard
- Level-based rewards and unlockables at milestone levels
- Career history of peak levels achieved

### At Quarter Transitions
- Celebratory summary of your quarterly achievements
- Peak level preserved in career history
- Fresh start at Level 1 with XP reset to 0

---

## Performance Scoring Formula

### Base Score Calculation
Each stat contributes weighted points to a raw Performance Score:

| Stat | Weight | Notes |
|------|--------|-------|
| Points | 1.0 | Base scoring value |
| Assists | 1.5 | Playmaking premium |
| Rebounds | 1.2 | Board work valued |
| Steals | 2.0 | High impact defensive |
| Blocks | 2.0 | Rim protection valued |
| Turnovers | -1.5 | Negative impact |
| Fouls | -0.5 | Minor penalty |

### Efficiency Multipliers
- **FG% Bonus**: +10% score if shooting 50%+ on 5+ attempts
- **FT% Bonus**: +5% score if 80%+ on 3+ attempts  
- **Zero Turnovers**: +15% bonus
- **Win Bonus**: +20% for wins

### Performance Tiers & XP Conversion

| Performance Tier | Raw Score Range | XP Awarded |
|-----------------|-----------------|------------|
| Struggling | 0-15 | 50-100 XP |
| Developing | 16-30 | 100-200 XP |
| Solid | 31-50 | 200-350 XP |
| Great | 51-75 | 350-500 XP |
| Elite | 76-100 | 500-700 XP |
| Legendary | 101+ | 700-1000 XP |

---

## Leveling Curve

### XP Requirements Per Level (Non-Linear)
```text
Level 1 → 2:     100 XP    (Easy onboarding)
Level 5 → 6:     250 XP    
Level 10 → 11:   500 XP    (Steady climb begins)
Level 20 → 21:   800 XP    
Level 30 → 31:   1,200 XP  (Grind zone)
Level 40 → 41:   1,800 XP  (Elite territory)
Level 49 → 50:   2,500 XP  (Final push)

Total XP for Level 50: ~45,000 XP
Estimated games needed: 90-120 games (playing well)
```

### Configurable Formula
```text
XP_required(level) = BASE_XP * (1 + (level * GROWTH_RATE))^CURVE_FACTOR

Where:
- BASE_XP = 100
- GROWTH_RATE = 0.08
- CURVE_FACTOR = 1.5
```

---

## Quarterly Reset System

### Quarter Definitions
- Q1: January 1 - March 31
- Q2: April 1 - June 30  
- Q3: July 1 - September 30
- Q4: October 1 - December 31

### On Reset
- Current XP → 0
- Current Level → 1
- Preserved: Peak level achieved, all game stats, milestones earned

### Historical Tracking
- Career peak level across all quarters
- Best quarter performance
- Season-over-season progression

---

## Level Rewards & Unlockables

| Level | Reward |
|-------|--------|
| 5 | "Rising Star" profile badge |
| 10 | Bronze level frame for avatar |
| 15 | "Consistent" title |
| 20 | Exclusive level flair color |
| 25 | Silver level frame + "Grinder" title |
| 30 | "All-Star" profile badge |
| 35 | Gold level frame |
| 40 | "Elite" title + animated badge |
| 45 | Diamond level frame |
| 50 | "Legend" title + special animated effects + quarterly hall of fame entry |

---

## Technical Details

### Database Changes

**New Table: `player_xp_progress`**
```text
+--------------------+-----------+--------------------------------+
| Column             | Type      | Description                    |
+--------------------+-----------+--------------------------------+
| id                 | uuid      | Primary key                    |
| user_id            | uuid      | Player reference               |
| quarter            | text      | e.g., "2026-Q1"                |
| current_xp         | integer   | XP in current quarter          |
| current_level      | integer   | Level 1-50                     |
| peak_level         | integer   | Highest level this quarter     |
| games_logged       | integer   | Games played this quarter      |
| created_at         | timestamp | Quarter start                  |
| updated_at         | timestamp | Last update                    |
+--------------------+-----------+--------------------------------+
```

**New Table: `player_xp_history`**
```text
+--------------------+-----------+--------------------------------+
| Column             | Type      | Description                    |
+--------------------+-----------+--------------------------------+
| id                 | uuid      | Primary key                    |
| user_id            | uuid      | Player reference               |
| quarter            | text      | e.g., "2025-Q4"                |
| final_level        | integer   | Level reached at quarter end   |
| total_xp_earned    | integer   | Cumulative XP that quarter     |
| games_played       | integer   | Games logged                   |
| avg_performance    | numeric   | Average performance score      |
| archived_at        | timestamp | When quarter ended             |
+--------------------+-----------+--------------------------------+
```

**New Table: `level_rewards`**
```text
+--------------------+-----------+--------------------------------+
| Column             | Type      | Description                    |
+--------------------+-----------+--------------------------------+
| id                 | uuid      | Primary key                    |
| level_required     | integer   | Level to unlock (5, 10, etc.)  |
| reward_type        | text      | 'badge', 'title', 'frame'      |
| reward_name        | text      | e.g., "Rising Star"            |
| reward_icon        | text      | Emoji or icon identifier       |
| description        | text      | What the reward represents     |
+--------------------+-----------+--------------------------------+
```

**New Table: `player_level_rewards`**
```text
+--------------------+-----------+--------------------------------+
| Column             | Type      | Description                    |
+--------------------+-----------+--------------------------------+
| id                 | uuid      | Primary key                    |
| user_id            | uuid      | Player reference               |
| reward_id          | uuid      | Reference to level_rewards     |
| unlocked_at        | timestamp | When earned                    |
| unlocked_quarter   | text      | Which quarter unlocked         |
+--------------------+-----------+--------------------------------+
```

### Files to Create

**Hooks:**
- `src/hooks/useXpProgress.ts` - Core XP/level state management
- `src/hooks/usePerformanceScore.ts` - Score calculation logic

**Components:**
- `src/components/xp/XpProgressBar.tsx` - Animated level progress display
- `src/components/xp/LevelBadge.tsx` - Level indicator with styling
- `src/components/xp/PostGameXpReveal.tsx` - 2K-style XP animation after game
- `src/components/xp/PerformanceBreakdown.tsx` - Stat contribution display
- `src/components/xp/QuarterlyProgress.tsx` - Dashboard widget
- `src/components/xp/LevelUpCelebration.tsx` - Full-screen level-up animation
- `src/components/xp/LevelRewardCard.tsx` - Unlockable reward display
- `src/components/xp/SeasonLeaderboard.tsx` - Quarterly rankings

**Utilities:**
- `src/utils/performanceScoring.ts` - Score calculation formulas
- `src/utils/xpCalculations.ts` - XP/level math utilities
- `src/utils/quarterUtils.ts` - Quarter detection and management

**Types:**
- `src/types/xp.ts` - XP system type definitions

### Files to Modify

- `src/hooks/useGameWithMilestones.ts` - Trigger XP calculation after game save
- `src/pages/GameDetail.tsx` - Add XP reveal component to post-game flow
- `src/pages/Index.tsx` - Add quarterly progress widget to dashboard
- `src/components/games/GamesHub.tsx` - Add Season Progress tab
- `src/components/PlayerHeader.tsx` - Display level badge

### Scheduled Function

**Quarterly Reset Cron Job:**
A pg_cron job that runs at midnight on Jan 1, Apr 1, Jul 1, Oct 1 to:
1. Archive current quarter data to `player_xp_history`
2. Reset `player_xp_progress` for all users
3. Preserve peak level achievements

---

## Post-Game Flow Integration

```text
1. User saves game stats
   ↓
2. Milestones checked (existing flow)
   ↓
3. Performance score calculated
   ↓
4. XP awarded based on tier
   ↓
5. Level checked for level-up
   ↓
6. If level-up: Check for new reward unlocks
   ↓
7. Show XP reveal animation
   ↓
8. If level-up: Show level-up celebration
   ↓
9. If new reward: Show reward unlock
   ↓
10. Navigate to game detail page
```

---

## Implementation Steps

1. Create database tables and RLS policies
2. Seed level rewards data
3. Implement utility functions for scoring/XP math
4. Create XP progress hook
5. Build UI components (progress bar, level badge, etc.)
6. Create post-game XP reveal animation
7. Integrate XP calculation into game save flow
8. Add level-up celebration animation
9. Build quarterly progress dashboard widget
10. Create season leaderboard
11. Set up quarterly reset cron job
12. Add level rewards unlock system
