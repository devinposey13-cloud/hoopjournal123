
# Bug Fix: Milestones Not Being Awarded After Game Performance

## Problem Summary
Users are not receiving milestone cards after qualifying game performances (e.g., scoring 20+ points, making 2+ three-pointers). The milestone tab shows no earned milestones despite multiple qualifying games in the database.

## Root Cause Analysis

The `GameDetail.tsx` page—where most games are actually logged via Live Stats Capture—uses `useCloudData()` instead of `useGameWithMilestones()`. This means:

1. Games are inserted **directly to the database** via raw Supabase calls
2. The milestone checking logic in `checkAndAwardMilestones()` is **never invoked**
3. No milestones are awarded or saved to `player_milestones` table

```text
User Flow (Current - Broken):
┌─────────────────────────────────────────────────────────────┐
│ GameDetail.tsx → handleAddGame() → supabase.insert()       │
│                                                             │
│              ❌ Milestones are NEVER checked                │
└─────────────────────────────────────────────────────────────┘

User Flow (Expected - Fixed):
┌─────────────────────────────────────────────────────────────┐
│ GameDetail.tsx → addGame() → useGameWithMilestones         │
│                           ↓                                 │
│              checkAndAwardMilestones() ✅                   │
│                           ↓                                 │
│              Save to player_milestones table ✅             │
│                           ↓                                 │
│              Show MilestoneReveal animation ✅              │
└─────────────────────────────────────────────────────────────┘
```

## Database Evidence
- **Games table**: Contains qualifying games (27 pts, 23 pts, 3PT made)
- **player_milestones table**: Empty (no milestones awarded)

## Solution

Refactor `GameDetail.tsx` to use the milestone-aware `useGameWithMilestones()` hook instead of `useCloudData()`. This requires:

1. **Import and use the correct hook**
2. **Replace direct Supabase inserts with the `addGame()` function** from the hook
3. **Add MilestoneReveal modal** to show earned milestones
4. **Handle milestone reveal close** with navigation to game detail

---

## Implementation Details

### File: `src/pages/GameDetail.tsx`

**Change 1: Update import and hook usage (lines 6-7, 49-50)**

Replace:
```typescript
import { useCloudData } from '@/hooks/useCloudData';
// ...
const { profile, seasonStats, activeSeason, updateScheduledGame, addScheduledGame } = useCloudData();
```

With:
```typescript
import { useGameWithMilestones } from '@/hooks/useGameWithMilestones';
// ...
const { 
  profile, 
  seasonStats, 
  activeSeason, 
  updateScheduledGame, 
  addScheduledGame,
  games,
  addGame,
  pendingMilestones,
  showReveal,
  closeReveal,
} = useGameWithMilestones();
```

**Change 2: Refactor `handleAddGame` to use hook's `addGame` (lines 153-202)**

Replace the direct Supabase insert with:
```typescript
const handleAddGame = async (gameData: Omit<GameStats, 'id'>) => {
  if (!user) return;
  
  setIsSubmitting(true);
  try {
    const savedGame = await addGame(gameData);
    
    if (savedGame) {
      toast.success('Game stats saved!');
      setShowAddStatsDialog(false);
      setShowLiveCapture(false);
      
      // Navigate to the new game detail page (but don't navigate if milestones are showing)
      if (!showReveal) {
        navigate(`/game/${savedGame.id}`, { replace: true });
      }
    }
  } catch (err) {
    console.error('Error adding game:', err);
    toast.error('Failed to save game stats');
    setShowLiveCapture(false);
  } finally {
    setIsSubmitting(false);
  }
};
```

**Change 3: Refactor `handleLiveCaptureSave` insert paths (lines 267-333, 367-398)**

For "game over" inserts (line 330-332), use the same pattern:
```typescript
// Instead of: await handleAddGame(gameData);
// This now uses the milestone-aware addGame internally
await handleAddGame(gameData);
```

For "not game over" inserts (line 369-397), these are mid-game saves that should NOT trigger milestones yet. Keep the direct Supabase insert for these cases.

**Change 4: Add MilestoneReveal import and component**

Add import:
```typescript
import { MilestoneReveal } from '@/components/milestones/MilestoneReveal';
```

Add state for tracking the game ID for navigation after reveal:
```typescript
const [lastSavedGameId, setLastSavedGameId] = useState<string | null>(null);
```

Add the MilestoneReveal modal at the end of the component, before the final `</>`):
```typescript
{/* Milestone Reveal Modal */}
<MilestoneReveal
  milestones={pendingMilestones}
  isOpen={showReveal}
  onClose={() => {
    closeReveal();
    // Navigate to game detail after closing reveal
    if (lastSavedGameId && !id) {
      navigate(`/game/${lastSavedGameId}`, { replace: true });
    }
  }}
/>
```

**Change 5: Track saved game ID for post-reveal navigation**

Update `handleAddGame` to store the saved game ID:
```typescript
if (savedGame) {
  setLastSavedGameId(savedGame.id);
  // ... rest of logic
}
```

---

## Summary of Edits

| Location | Change |
|----------|--------|
| Line 6-7 | Replace `useCloudData` import with `useGameWithMilestones` |
| Line 27 | Add `MilestoneReveal` import |
| Line 49-50 | Destructure additional props from `useGameWithMilestones` |
| Lines 153-202 | Refactor `handleAddGame` to use hook's `addGame()` |
| Line 330-332 | Ensure "game over" path uses milestone-aware add |
| After closing tag | Add `MilestoneReveal` modal component |

---

## What Stays the Same
- Mid-game saves (game not over) continue to use direct Supabase insert - these shouldn't trigger milestones until the game is complete
- The `Index.tsx` page already uses `useGameWithMilestones` correctly
- The milestone checking logic in `useMilestones.ts` and `milestoneChecker.ts` is correct

## Result After Fix
- When a game is saved with "game over" = true, milestones will be checked
- If qualifying milestones are earned, the 2K-style reveal animation will play
- Milestones will be saved to `player_milestones` table
- Users will see their earned milestones in the Milestones tab
