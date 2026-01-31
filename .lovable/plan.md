
# Track Milestone History with Flip-Card Log

## Overview
This feature changes how repeatable milestones are handled to keep reveals "limited and desirable":

| Category | First Earn | Subsequent Earns | Milestones Tab |
|----------|-----------|------------------|----------------|
| Single-Game Repeatable | Full reveal animation | Silently recorded, toast notification only | Flip card shows history log |
| Multi-Game Streaks | Full reveal animation | Full reveal animation (always) | Flip card shows streak games |
| Season Cumulative | Full reveal animation | N/A (one-time) | Flip card shows season stats |

## Current Behavior
- All repeatable milestones trigger the reveal animation every time they're earned
- The MilestoneCard shows only the most recent occurrence
- No flip interaction exists on milestone cards

## Proposed Changes

### Part 1: Modify Reveal Logic for Single-Game vs Multi-Game

**File: `src/hooks/useMilestones.ts`**

Update `checkAndAwardMilestones` to return two separate result sets:

```typescript
interface MilestoneCheckResult {
  toReveal: NewMilestoneResult[];      // Show in reveal animation
  silentlyRecorded: NewMilestoneResult[]; // Just saved, no reveal
}
```

Logic:
- **Single-game repeatable milestones**: Check if EVER earned before
  - First time → add to `toReveal`
  - Subsequent → add to `silentlyRecorded` (still save to DB)
- **Multi-game streak milestones**: Always add to `toReveal` (patterns across games deserve celebration each time)
- **Season milestones**: Check if earned → add to `toReveal` (one-time only)

### Part 2: Update MilestoneCard with Flip Animation

**File: `src/components/milestones/MilestoneCard.tsx`**

Add a 3D flip card with two sides:

```text
FRONT (existing design)          BACK (new history log)
+------------------------+       +------------------------+
|         [Icon]         |       |    Earned 5x           |
|    Milestone Name      |  ↔    |                        |
|        EPIC            |       | • vs Rebels - Jan 5    |
|                        |       |   27 PTS, 14 REB       |
| 27 PTS, 14 REB, 8 AST  |       | • vs Bison - Jan 7     |
| vs Rebels · Jan 5      |       |   23 PTS, 7 REB        |
+------------------------+       | • vs Falcons - Jan 9   |
                                 |   14 PTS, 4 REB        |
                                 +------------------------+
```

New props:
```typescript
interface MilestoneCardProps {
  // ... existing props
  allOccurrences?: PlayerMilestone[]; // All times this milestone was earned
  showFlipHint?: boolean;             // Show tap indicator for multi-occurrence cards
}
```

Animation implementation:
- Use CSS 3D transforms with `transform-style: preserve-3d`
- Click/tap toggles `rotateY(180deg)`
- Framer Motion for smooth transitions
- Back side has ScrollArea for long history logs

### Part 3: Add Occurrence Grouping to useMilestones

**File: `src/hooks/useMilestones.ts`**

Add helper to group earned milestones by definition ID:

```typescript
const getOccurrencesByMilestoneId = useCallback((): Map<string, PlayerMilestone[]> => {
  const map = new Map<string, PlayerMilestone[]>();
  for (const pm of earnedMilestones) {
    const list = map.get(pm.milestoneId) || [];
    list.push(pm);
    map.set(pm.milestoneId, list);
  }
  return map;
}, [earnedMilestones]);
```

Export this from the hook so MilestoneCollection can use it.

### Part 4: Update MilestoneCollection UI

**File: `src/components/milestones/MilestoneCollection.tsx`**

- Pass `allOccurrences` array to each MilestoneCard
- Show occurrence count badge (e.g., "5x") in corner for cards with multiple occurrences
- Add visual hint that multi-occurrence cards are tappable

```typescript
const occurrenceMap = useMemo(() => {
  const map = new Map<string, PlayerMilestone[]>();
  earnedMilestones.forEach(pm => {
    const list = map.get(pm.milestoneId) || [];
    list.push(pm);
    map.set(pm.milestoneId, list);
  });
  return map;
}, [earnedMilestones]);

// In render:
<MilestoneCard
  milestone={def}
  allOccurrences={occurrenceMap.get(def.id) || []}
  showFlipHint={(occurrenceMap.get(def.id)?.length || 0) > 1}
/>
```

### Part 5: Update useGameWithMilestones Hook

**File: `src/hooks/useGameWithMilestones.ts`**

Update to handle the new return structure:
- Only show reveal for `toReveal` milestones
- Show toast for `silentlyRecorded` milestones: "Double Digit Scorer achieved again! (5th time)"

### Part 6: Update Game Detail Post-Game Report

**File: `src/pages/GameDetail.tsx`**

Keep showing ALL milestones earned for this game in the "Milestones Earned" section (including repeated ones). The distinction is only about the reveal animation, not the permanent record.

Optionally add a visual indicator for repeated achievements:
- First-time milestones: Normal display
- Repeated milestones: Small badge showing "×3" or similar

### Part 7: PDF Export Updates

**File: `src/utils/exportPdf.ts`**

No changes needed - the PDF already exports all milestones linked to the game ID. We continue to show all earned milestones in exports.

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useMilestones.ts` | Split return into `toReveal` and `silentlyRecorded`; add occurrence grouping helper |
| `src/components/milestones/MilestoneCard.tsx` | Add flip animation with history log on back |
| `src/components/milestones/MilestoneCollection.tsx` | Pass occurrence data; add "×N" badge |
| `src/hooks/useGameWithMilestones.ts` | Handle new return structure; show toast for silent records |
| `src/pages/GameDetail.tsx` | Minor badge indicator for repeated milestones (optional) |

## Technical Details

### Flip Animation CSS

```css
.card-container {
  perspective: 1000px;
}
.card-inner {
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}
.card-inner.flipped {
  transform: rotateY(180deg);
}
.card-front, .card-back {
  position: absolute;
  backface-visibility: hidden;
  width: 100%;
  height: 100%;
}
.card-back {
  transform: rotateY(180deg);
}
```

### Multi-Game Milestone Detection

In `useMilestones.ts`, detect category to determine reveal behavior:

```typescript
const isMultiGameMilestone = (def: MilestoneDefinition) => 
  def.category === 'multi_game';

// For multi-game milestones, ALWAYS reveal
// For single-game repeatable, only reveal FIRST time
```

### History Log Entry Format

Each entry in the flip-card back shows:
- Opponent name
- Date earned
- Key stats (PTS, REB, AST if applicable)

For streak milestones, show the games that comprised the streak.

## User Experience After Implementation

### During a game with repeated single-game milestone:
1. Player scores 20+ points again (has done this before)
2. "Double Digit Scorer" is recorded in database
3. Reveal animation does NOT play
4. Toast: "Double Digit Scorer achieved again! (5th time)"

### During a game completing a streak:
1. Player makes a 3-pointer for the 3rd straight game
2. "3-Point Streak" is recorded
3. Reveal animation DOES play (streaks always celebrate)

### In Milestones tab:
1. Card shows "5×" badge in corner
2. Tapping card flips to reveal history
3. Back shows all games with dates and stats

### On Game Detail page:
1. All milestones earned in that game are shown
2. Repeated milestones show a small "×5" indicator

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Season milestones (non-game specific) | Show season totals on back, not game list |
| Cards with only one occurrence | Still flippable, back shows "Earned 1 time" |
| Multi-game milestones without specific games | Show general stats instead of game list |
| User views card immediately after earning | Front shows latest occurrence, back shows full history |
