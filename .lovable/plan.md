

# Game Score Calculation Engine for Report Cards

## Overview
Replace the current tier-based grading system with a new Game Score formula that directly determines letter grades. Add a `game_score` column to the `games` table so scores persist for analytics.

## Database Change

Add `game_score` column to the `games` table:
```sql
ALTER TABLE public.games ADD COLUMN game_score NUMERIC(5,1);
```

No RLS changes needed — existing policies cover this column.

## Changes to `src/utils/gameGrading.ts`

Replace the entire grading engine:

- **New `calculateGameScore(game)` function** using the specified formula:
  `Points + Rebounds + (1.5 × Assists) + (2 × Steals) + (2 × Blocks) - (1.5 × Turnovers)`, rounded to 1 decimal.

- **New grade type**: `'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+'` (remove D, F)

- **New `getLetterGradeFromScore(score)` function** using the specified thresholds:
  - ≥30 → A+, 24–29.9 → A, 19–23.9 → A-, 15–18.9 → B+, 12–14.9 → B, 9–11.9 → B-, <9 → C+

- **Updated `getGradeColor()`** with per-grade colors:
  - A+ → gold, A → orange, A- → light orange, B+ → soft orange, B → neutral gray, B- → light gray, C+ → muted gray

- **Updated `getGameGradeData()`** to use Game Score instead of performance tiers for grading. Still uses `calculatePerformance()` for XP (XP system stays independent).

## Changes to `src/components/GameReportCard.tsx`

- Display the Game Score on the card (below the grade, e.g., "Game Score: 32.5")
- Update destructured data to include `gameScore` from the updated `getGameGradeData()`

## Changes to `src/pages/GameDetail.tsx`

- When saving a game (insert or update), compute `game_score` using `calculateGameScore()` and include it in the database write
- Display Game Score in the game detail view alongside the grade

## Changes to `src/hooks/useCloudData.ts` / `src/hooks/useGameWithMilestones.ts`

- When inserting games via `addGame`, also compute and save `game_score`

## Changes to `src/types/basketball.ts`

- Add `gameScore?: number` to `GameStats` interface

## Summary of Flow
1. User logs game → Game Score calculated from formula → saved to DB
2. Report Card reads `game_score` → converts to letter grade → displays grade + score
3. XP system continues using existing `calculatePerformance()` independently
4. Game Score persists in DB for future analytics/trends

