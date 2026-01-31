
# Delete Retroactive Edge Function & Add Milestone Cleanup on Game Deletion

## Overview
This plan addresses two requirements:
1. Delete the one-time `award-retroactive-milestones` edge function
2. Implement milestone recalculation when games are deleted, so cards that no longer qualify return to "locked" status

## Current Problem
When a game is deleted:
- The game is removed from the database
- But milestones earned from that game **remain in the database**
- Multi-game milestones (e.g., "Win Streak") may no longer be valid if the deleted game broke the streak
- Season milestones may no longer be valid if cumulative totals drop below thresholds

## Solution

### Part 1: Delete the Edge Function
Delete the one-time retroactive milestone script that has already been run.

| Action | Path |
|--------|------|
| Delete folder | `supabase/functions/award-retroactive-milestones/` |

### Part 2: Create Milestone-Aware Game Deletion

**File: `src/hooks/useGameWithMilestones.ts`**

Add a new `deleteGameWithMilestones` function that:

1. **Deletes the game** from the database (using existing `cloudData.deleteGame`)
2. **Deletes all milestones linked to that game** (single-game milestones stored with `game_id`)
3. **Re-evaluates remaining milestones** against the updated game list:
   - For multi-game milestones (streaks, games played): Check if conditions still met
   - For season milestones: Recalculate totals and check thresholds
4. **Removes invalidated milestones** from the database
5. **Refreshes the milestone state** so UI updates immediately

```typescript
const deleteGameWithMilestones = useCallback(async (gameId: string) => {
  if (!user) return;

  // 1. Delete milestones directly linked to this game
  await supabase
    .from('player_milestones')
    .delete()
    .eq('game_id', gameId);

  // 2. Delete the game
  await cloudData.deleteGame(gameId);

  // 3. Re-evaluate remaining multi-game and season milestones
  const remainingGames = cloudData.games.filter(g => g.id !== gameId);
  const invalidMilestoneIds = await findInvalidMilestones(
    remainingGames,
    definitions,
    earnedMilestones,
    cloudData.activeSeason?.id
  );

  // 4. Remove invalidated milestones
  if (invalidMilestoneIds.length > 0) {
    await supabase
      .from('player_milestones')
      .delete()
      .in('id', invalidMilestoneIds);
  }

  // 5. Refresh milestone state
  await refreshMilestones();
}, [user, cloudData, definitions, earnedMilestones, refreshMilestones]);
```

**File: `src/hooks/useMilestones.ts`**

Add a helper function to identify invalidated milestones:

```typescript
function findInvalidMilestones(
  currentGames: GameWithId[],
  definitions: MilestoneDefinition[],
  earnedMilestones: PlayerMilestone[],
  seasonId?: string
): string[] {
  const invalidIds: string[] = [];
  
  // Check each earned milestone
  for (const earned of earnedMilestones) {
    const def = definitions.find(d => d.id === earned.milestoneId);
    if (!def) continue;
    
    // Skip single-game milestones (already handled by cascade)
    if (def.category === 'single_game') continue;
    
    // Check multi-game milestones
    if (def.category === 'multi_game') {
      const stillValid = checkMultiGameMilestoneValidity(currentGames, def);
      if (!stillValid) invalidIds.push(earned.id);
    }
    
    // Check season milestones
    if (def.category === 'season') {
      const seasonGames = currentGames.filter(g => seasonId && g.seasonId === seasonId);
      const stillValid = checkSeasonMilestoneValidity(seasonGames, def);
      if (!stillValid) invalidIds.push(earned.id);
    }
  }
  
  return invalidIds;
}
```

### Part 3: Update Components to Use New Delete Function

**File: `src/pages/Index.tsx`**

Update the `useGameWithMilestones` destructuring to include the new delete function:

```typescript
const {
  games,
  // ... other props
  deleteGame: deleteGameWithMilestones, // Use milestone-aware delete
  // ...
} = useGameWithMilestones();
```

**File: `src/hooks/useGameWithMilestones.ts`**

Export the new function alongside existing exports:

```typescript
return {
  ...cloudData,
  addGame: addGameWithMilestones,
  deleteGame: deleteGameWithMilestones, // Override with milestone-aware version
  // ... other milestone props
};
```

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/award-retroactive-milestones/` | **Delete** entire folder |
| `src/hooks/useGameWithMilestones.ts` | Add `deleteGameWithMilestones` function, export as `deleteGame` |
| `src/hooks/useMilestones.ts` | Add `findInvalidMilestones` helper and export it |

## How It Works After Implementation

1. User deletes a game from the GameCard or Index page
2. `deleteGameWithMilestones()` is called instead of the basic `deleteGame()`
3. Milestones linked to that specific game are removed
4. Remaining milestones are re-evaluated:
   - "Win Streak" (3 wins) → If deleted game broke the streak, milestone is removed
   - "100 Season Points" → If total drops below 100, milestone is removed
5. UI automatically updates as `refreshMilestones()` is called
6. Previously earned cards that no longer qualify return to "locked" status

## Edge Cases Handled
- Deleting a game that was part of a streak invalidates streak milestones
- Deleting a high-scoring game may invalidate season cumulative milestones
- Single-game milestones are always deleted when their linked game is deleted
- UI state refreshes immediately after deletion
