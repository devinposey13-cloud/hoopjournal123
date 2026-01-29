

# Milestone Achievement Cards System

## Overview
Replace the trading card rating system with a **goal-based milestone system** that celebrates specific achievements rather than evaluating players. This approach focuses on encouraging growth and setting attainable goals, which is much more positive for young players.

## Philosophy Change

```text
OLD APPROACH (Ratings):          NEW APPROACH (Milestones):
┌────────────────────────┐       ┌────────────────────────┐
│ OVR: 62 (feels low)    │       │ ★ First Double-Double  │
│ DEF: 45 (discouraging) │  →    │ ★ 3-Point Specialist   │
│ "You scored 45/99"     │       │ "You made 2+ threes!"  │
└────────────────────────┘       └────────────────────────┘
```

## Milestone Categories

### Single Game Milestones
| Milestone | Condition | Icon |
|-----------|-----------|------|
| Sharpshooter | 2+ three-pointers in one game | Target |
| Double-Double | 10+ in two stat categories | Star |
| Triple-Double | 10+ in three stat categories | Crown |
| Lockdown Defender | 3+ steals in one game | Shield |
| Shot Blocker | 3+ blocks in one game | Hand |
| Assist Master | 6+ assists in one game | Users |
| Scoring Machine | 20+ points in one game | Flame |
| Rebound King | 10+ rebounds in one game | ArrowUp |
| Perfect from the Line | 5+ FT made, 100% FT% | Circle |
| Efficient Scorer | 60%+ FG% with 10+ points | Target |

### Multi-Game Milestones
| Milestone | Condition | Icon |
|-----------|-----------|------|
| Consistent Shooter | 50%+ FG% over 2 consecutive games | TrendingUp |
| 3-Point Streak | Make a three in 3 consecutive games | Zap |
| Win Streak | Win 3 games in a row | Trophy |
| Iron Man | Play 5+ games in a season | Medal |
| Season Starter | Log your first game of the season | Play |

### Season Cumulative Milestones
| Milestone | Condition | Icon |
|-----------|-----------|------|
| 100 Point Club | 100 total points in a season | Star |
| Block Party | 20 total blocks in a season | Shield |
| Steal Master | 30 total steals in a season | Eye |
| Rebound Machine | 75 total rebounds in a season | ArrowUp |
| Playmaker | 50 total assists in a season | Users |
| 50 Three-Pointers | Make 50 threes in a season | Target |

## Card Reveal Experience

Instead of ratings, cards will showcase:
- The milestone name with celebratory styling
- The achievement description
- The game(s) where it was earned
- A 2K-style pack opening animation

### Pack Opening Animation Flow
```text
1. Card back with shimmer effect appears
2. User taps/clicks to reveal
3. Card flips with dramatic animation
4. Confetti/particles burst based on milestone rarity
5. Achievement name and description fade in
6. Optional sound effect plays
```

## Milestone Rarity Tiers

Milestones are categorized by difficulty rather than player rating:

| Tier | Examples | Card Style |
|------|----------|------------|
| **Common** | First game logged, 5+ points | Simple blue border |
| **Uncommon** | 2+ threes, 6+ assists | Green gradient |
| **Rare** | Double-double, 3+ steals | Gold shimmer |
| **Epic** | Triple-double, 20+ points | Purple holographic |
| **Legendary** | Perfect game, season records | Rainbow animated |

## Implementation Plan

### Step 1: Database Migration
- Remove `trading_cards` table (or repurpose it)
- Create `milestone_definitions` table with milestone rules
- Create `player_milestones` table to track earned milestones
- Update `player_badges` table to work with new system

### Step 2: Milestone Checker Utility
Create `src/utils/milestoneChecker.ts`:
- Check single-game milestones after each game logged
- Check multi-game/streak milestones
- Check season cumulative milestones
- Return newly earned milestones

### Step 3: Milestone Card Component
Create `src/components/milestones/MilestoneCard.tsx`:
- Celebratory card design (no ratings)
- Shows achievement name, description, date earned
- Tier-based visual styling
- No discouraging numbers

### Step 4: Pack Opening Animation
Create `src/components/milestones/MilestoneReveal.tsx`:
- Card flip animation
- Confetti/particle effects
- Sound effects integration
- Multiple cards if several milestones earned at once

### Step 5: Integration with Game Logging
Modify game logging flow:
- After a game is saved, check for new milestones
- If milestones earned, show pack opening animation
- Save milestones to database

### Step 6: Milestones Collection View
Create `src/components/milestones/MilestoneCollection.tsx`:
- Grid of earned milestone cards
- Progress toward unearned milestones
- Filter by category (single game, streak, season)
- Celebration animations on view

### Step 7: Update Games Hub
Replace "Cards" tab with "Milestones" tab in GamesHub.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add milestone tables, update or remove trading card tables |
| `src/types/milestone.ts` | Create | TypeScript types for milestones |
| `src/utils/milestoneChecker.ts` | Create | Logic to check if milestones are earned |
| `src/components/milestones/MilestoneCard.tsx` | Create | Individual milestone card display |
| `src/components/milestones/MilestoneReveal.tsx` | Create | Pack opening animation component |
| `src/components/milestones/MilestoneCollection.tsx` | Create | Collection view |
| `src/hooks/useMilestones.ts` | Create | Hook for milestone data management |
| `src/hooks/useCloudData.ts` | Modify | Trigger milestone check after game save |
| `src/components/games/GamesHub.tsx` | Modify | Replace Cards tab with Milestones |
| `src/components/trading-cards/*` | Delete | Remove old trading card components |

## Pack Opening Animation Details

The reveal animation will be inspired by 2K card pack openings:

### Animation Sequence
1. **Card Back Appears** (0.3s)
   - Card slides in from bottom
   - Subtle glow effect around edges

2. **Suspense Build** (0.5s)
   - Card wobbles slightly
   - Glow intensifies based on rarity

3. **Flip Reveal** (0.6s)
   - 3D flip animation
   - Rarity-colored particles burst
   - Background blur/dim effect

4. **Celebration** (1s)
   - Confetti for Rare+
   - Pulsing glow effect
   - Achievement text animates in

5. **Settle** (0.3s)
   - Card settles into final position
   - "Add to Collection" button appears

### CSS Animations Required
- `@keyframes card-flip` - 3D Y-axis rotation
- `@keyframes confetti-burst` - Particle explosion
- `@keyframes glow-pulse` - Border glow animation
- `@keyframes text-reveal` - Text fade/scale in

## UI/UX Changes

### Milestone Card Design (No Ratings)
```text
┌─────────────────────────────────┐
│   ★ DOUBLE-DOUBLE ★             │
│   ┌───────────────────────┐     │
│   │                       │     │
│   │    [Star Icon]        │     │
│   │                       │     │
│   └───────────────────────┘     │
│                                 │
│   "You recorded 10+ in two      │
│    stat categories!"            │
│                                 │
│   12 PTS • 11 REB               │
│   vs Lakers • Jan 28, 2026      │
│                                 │
│   [RARE ACHIEVEMENT]            │
└─────────────────────────────────┘
```

### Collection View
- Earned milestones shown in full color
- Unearned shown as silhouettes with "How to Earn" tooltips
- Progress bars for cumulative milestones (e.g., "75/100 points")
- Category filters: All, Single Game, Streaks, Season

## Data to Remove

The following will be removed or repurposed:
- `trading_cards` table → Delete or repurpose
- `src/components/trading-cards/*` → Delete
- `src/hooks/useTradingCards.ts` → Replace with `useMilestones.ts`
- `src/utils/badgeCalculator.ts` → Replace with `milestoneChecker.ts`
- `supabase/functions/generate-trading-card` → Delete

## Technical Notes

### Milestone Check Trigger Points
1. **After Game Save**: Check single-game milestones immediately
2. **After Game Save**: Check multi-game streaks
3. **On Dashboard Load**: Check season cumulative progress

### Milestone Definition Schema
```typescript
interface MilestoneDefinition {
  id: string;
  name: string;
  description: string;
  category: 'single_game' | 'multi_game' | 'season';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  check_type: string; // e.g., 'three_pt_made_gte', 'double_double', etc.
  threshold: number;
  secondary_threshold?: number; // For streak length, etc.
}
```

