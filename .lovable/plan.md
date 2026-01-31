

# Milestone System Expansion: New Creative Cards + Monthly Challenges

## Current State Analysis

Your milestone system is already robust with **87 total milestones** across three categories:
- **52 Single-Game** milestones (performance in one game)
- **13 Multi-Game** milestones (streaks, consistency)
- **22 Season** milestones (cumulative totals)

There are **31 check types** currently implemented, covering points, rebounds, assists, steals, blocks, 3-pointers, efficiency, and various combinations.

---

## Expansion Opportunities

### New Creative Milestone Ideas (40+ New Cards)

**1. Comeback & Clutch Milestones (Single-Game)**
| Name | Description | Rarity |
|------|-------------|--------|
| Comeback Kid | Win after being down at halftime | Rare |
| Clutch Performer | Score 5+ points in final quarter | Uncommon |
| Closer | Hit game-winning shot | Epic |
| Ice in Veins | Make 2+ clutch free throws (90%+ FT in a win) | Rare |

**2. Efficiency & Smart Play (Single-Game)**
| Name | Description | Rarity |
|------|-------------|--------|
| Turnover-Free Zone | Play 20+ minutes with 0 turnovers | Uncommon |
| Ball Security | 5+ assists with 0 turnovers | Rare |
| Floor General | 8+ assists in a single game | Rare |
| Facilitator | More assists than field goal attempts | Epic |
| Efficient Engine | 15+ points on 60%+ shooting | Rare |
| Perfect Touch | 100% FT with 5+ attempts | Rare |

**3. Defensive Excellence (Single-Game)**
| Name | Description | Rarity |
|------|-------------|--------|
| Lockdown Defender | 3+ steals and 2+ blocks | Epic |
| Pickpocket | 5+ steals in a game | Rare |
| Rim Protector | 4+ blocks in a game | Epic |
| Glass Cleaner | 15+ rebounds | Epic |
| Pest | 4+ steals in a win | Rare |

**4. Rare Achievements (Single-Game)**
| Name | Description | Rarity |
|------|-------------|--------|
| 30-Point Explosion | Score 30+ points | Epic |
| 40-Point Eruption | Score 40+ points | Legendary |
| 5x5 | 5+ in all 5 major stats | Legendary |
| 20-20 Club | 20+ points and 20+ rebounds | Legendary |
| Triple-Threat | 20+ pts, 5+ reb, 5+ ast | Rare |

**5. Streak & Consistency (Multi-Game)**
| Name | Description | Rarity |
|------|-------------|--------|
| Rebound Streak | 8+ rebounds in 3 consecutive games | Rare |
| Defensive Streak | 2+ steals in 5 straight games | Epic |
| Double-Double Streak | Double-double in 3 straight games | Legendary |
| Consistency King | 10+ pts, 5+ reb, 3+ ast in 5 straight | Legendary |
| Hot Hand | 3+ threes in 3 consecutive games | Rare |
| Iron Will | Play 20+ min in 10 straight games | Epic |

**6. Season Cumulative (Season)**
| Name | Description | Rarity |
|------|-------------|--------|
| Century Club | 100 total rebounds in a season | Rare |
| Assist Master | 100 assists in a season | Epic |
| Swiper | 50 steals in a season | Rare |
| Shot Blocker | 25 blocks in a season | Rare |
| Sharpshooter Season | 50 three-pointers made | Uncommon |
| 1000 Point Season | Score 1000 points | Legendary |

---

## Monthly Challenge System

### Concept: Rotating Challenges

Each month, a fresh set of **3-5 time-limited challenges** appear. They reset automatically on the 1st of each month, creating urgency and replay value.

### Architecture

```text
+-------------------+     +----------------------+     +-------------------+
| monthly_challenges|---->| challenge_progress   |---->| challenge_rewards |
|                   |     | (per-user tracking)  |     | (badges earned)   |
+-------------------+     +----------------------+     +-------------------+
     |
     v
 Rotates monthly via
 pg_cron scheduled job
```

**New Database Tables:**

1. **monthly_challenges** - Defines each month's active challenges
   - `id`, `name`, `description`, `icon`, `check_type`, `threshold`
   - `month` (e.g., "2026-02"), `reward_points`, `difficulty`
   - `is_active` boolean

2. **challenge_progress** - Tracks user progress
   - `user_id`, `challenge_id`, `current_value`, `is_completed`
   - `completed_at`, `created_at`

3. **challenge_history** - Archive of past completed challenges

### Example Monthly Challenge Sets

**February 2026 - "Winter Grind"**
| Challenge | Goal | Reward |
|-----------|------|--------|
| Scoring Surge | Score 100 total points this month | 50 pts |
| Board Collector | Grab 50 rebounds this month | 40 pts |
| 3-Point February | Make 20 three-pointers | 60 pts |
| Win Streak | Win 3 games in a row | 75 pts |
| Perfect Game | 0 turnovers in any game | 30 pts |

**March 2026 - "March Madness"**
| Challenge | Goal | Reward |
|-----------|------|--------|
| Bracket Buster | Win 5 games this month | 60 pts |
| Assist Machine | Dish 30 assists | 50 pts |
| Defensive March | Get 25 steals + blocks combined | 55 pts |
| Hot Shooting | Shoot 50%+ FG for the month | 70 pts |
| Ironman | Log 8+ games this month | 80 pts |

### Auto-Rotation Logic

A backend job (pg_cron) runs on the 1st of each month to:
1. Archive current month's challenges to history
2. Activate next month's pre-seeded challenges
3. Reset all user progress for new month

---

## Implementation Plan

### Phase 1: Add New Static Milestones ✅ COMPLETED
1. ✅ Created database migration to insert 28 new milestone definitions
2. ✅ Added new check types to `milestoneChecker.ts`:
   - `zero_to_minutes` - 0 turnovers with X+ minutes
   - `ast_zero_to` - assists with 0 turnovers
   - `ast_gt_fga` - more assists than FGA
   - `efficient_high_scorer` - points on high FG%
   - `clutch_ft` - FT% in wins
   - `combined_defensive` - steals + blocks combo
   - `steals_in_win` - steals in a winning game
   - `five_by_five` - 5+ in all 5 stats
   - `twenty_twenty` - 20/20 club
   - `triple_threat` - 20+ pts, 5+ reb, 5+ ast
   - `rebound_streak` - multi-game rebound check
   - `steal_streak` - multi-game steal check
   - `double_double_streak` - consecutive DD games
   - `consistency_streak` - all-around consistency
   - `minutes_streak` - playing time consistency

### Phase 2: Monthly Challenge Infrastructure
1. Create `monthly_challenges` and `challenge_progress` tables
2. Build `useMonthlyChallenges` hook for fetching and tracking
3. Create `MonthlyChallengesCard` component for dashboard display
4. Add progress tracking when games are logged

### Phase 3: Challenge Rotation Automation
1. Create edge function `rotate-monthly-challenges`
2. Set up pg_cron job to run on 1st of each month
3. Pre-seed challenge templates for 6+ months ahead

### Phase 4: UI Integration
1. Add "Monthly Challenges" section to Milestones tab
2. Show countdown timer to month end
3. Display completion badges in collection
4. Add celebration animation for challenge completion

---

## Technical Considerations

### Check Type Extensions Needed

```typescript
// New check types to add to milestoneChecker.ts
case 'ast_to_to_ratio':
  return game.turnovers === 0 || 
    (game.assists / Math.max(game.turnovers, 1)) >= def.threshold;

case 'combined_defensive':
  return (game.steals + game.blocks) >= def.threshold;

case 'minutes_gte':
  return game.minutesPlayed >= def.threshold;

case 'five_by_five':
  return game.points >= 5 && game.rebounds >= 5 && 
    game.assists >= 5 && game.steals >= 5 && game.blocks >= 5;

case 'twenty_twenty':
  return game.points >= 20 && game.rebounds >= 20;
```

### Monthly Challenge Progress Hook

```typescript
// useMonthlyChallenge hook pattern
const updateChallengeProgress = async (gameStats: GameStats) => {
  // Fetch active challenges for current month
  // Calculate contribution from this game
  // Update progress in challenge_progress table
  // Check for completions and award if threshold met
};
```

---

## Summary

| Category | Current | Proposed New | Total |
|----------|---------|--------------|-------|
| Single-Game | 52 | 25 | 77 |
| Multi-Game | 13 | 10 | 23 |
| Season | 22 | 8 | 30 |
| Monthly Challenges | 0 | 5/month | 60/year |
| **Total Static** | 87 | 43 | **130** |

This expansion adds **43 new permanent milestones** plus a **rotating monthly challenge system** that keeps players engaged with fresh goals every month.

