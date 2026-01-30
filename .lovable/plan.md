

# Fix Milestone Opponent Display

## Problem Identified

The existing milestone records in the database contain **test/sample data** with hardcoded opponent names ("Lakers", "Celtics") that don't correspond to actual games. Specifically:

- All milestones have `game_id: null` 
- The `stats_snapshot` contains `opponent: "Lakers"` which is hardcoded test data
- Real games in the database are against teams like "Asia" and "Gonzaga College"

The code that creates milestones is correct - it properly extracts the opponent from real game data. The issue is that the initial milestone data was seeded with fake values.

## Solution Approach

### Part 1: Update MilestoneCard to Use Game Data When Available

Modify the `MilestoneCard` component and `MilestoneCollection` to pass the actual game data, so we can look up the real opponent even if the `stats_snapshot` is incorrect.

1. **MilestoneCollection.tsx**: 
   - Create a `gamesMap` from `game_id` → `game` for quick lookup
   - Pass the actual game's opponent to MilestoneCard when `gameId` exists

2. **MilestoneCard.tsx**:
   - Add optional `gameOpponent` prop that overrides `statsSnapshot.opponent`
   - Display the real opponent when available

### Part 2: Data Cleanup Option

Provide you with an option to clean up the corrupted milestone data:
- Delete milestones with invalid opponent data (like "Lakers", "Celtics")
- Or update them to link to actual games based on matching criteria

---

## Technical Details

### File Changes

**src/components/milestones/MilestoneCollection.tsx**
- Create `gamesMap` from games array for O(1) lookup by game ID
- Pass `gameOpponent` prop when earned milestone has a valid `gameId` that matches a game

```typescript
// Create lookup map for games
const gamesMap = useMemo(() => {
  const map = new Map<string, typeof games[0]>();
  games.forEach(g => {
    if (g.id) map.set(g.id, g);
  });
  return map;
}, [games]);

// In MilestoneCard render:
const linkedGame = earned?.gameId ? gamesMap.get(earned.gameId) : undefined;
<MilestoneCard
  ...
  gameOpponent={linkedGame?.opponent}
/>
```

**src/components/milestones/MilestoneCard.tsx**
- Add `gameOpponent?: string` prop
- Use `gameOpponent` if provided, otherwise fall back to `statsSnapshot.opponent`

```typescript
interface MilestoneCardProps {
  ...
  gameOpponent?: string; // Override opponent from actual game data
}

// In render:
const displayOpponent = gameOpponent || statsSnapshot?.opponent;
{displayOpponent && (
  <div className="text-xs text-muted-foreground mt-1">
    vs {displayOpponent}
  </div>
)}
```

### Data Cleanup (Optional)

After implementing the fix, you can choose to clean up the corrupted data:

```sql
-- Option 1: Delete milestones with test data
DELETE FROM player_milestones 
WHERE stats_snapshot->>'opponent' IN ('Lakers', 'Celtics');

-- Option 2: Or leave them - they'll just show without opponent info
-- since game_id is null and no game matches
```

---

## Expected Outcome

After this change:
- Milestones linked to real games will display the actual opponent name from the games table
- Milestones with corrupted/test data will either show no opponent (if game_id is null) or the correct opponent (if game_id exists)
- Future milestones will work correctly since the code already saves proper game data

