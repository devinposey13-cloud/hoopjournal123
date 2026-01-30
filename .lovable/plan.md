
# Navigate to Game Details on Milestone Reveal Close

## Overview
Update the milestone reveal flow so that clicking the "X" button (or completing the reveal) navigates directly to the game details page instead of staying on the current tab.

---

## Current Behavior
- Milestones are triggered after saving a game
- Each pending milestone already contains the `gameId` it was earned from
- Clicking "X" or "Awesome!" calls `closeReveal()` which only clears state
- User stays on whatever tab they were on (schedule tab in your case)

## Proposed Behavior
- Clicking "X" or completing the reveal navigates to `/game/:gameId`
- The game ID comes from the milestone data (first milestone's `gameId`)

---

## Changes Required

### 1. Update MilestoneReveal Component
**File:** `src/components/milestones/MilestoneReveal.tsx`

- Add `useNavigate` from react-router-dom
- Modify `onComplete` to also navigate to the game details page
- Use the first milestone's `gameId` to determine the destination

Changes:
- Import `useNavigate` from `react-router-dom`
- Get the `gameId` from the milestones prop (first milestone with a gameId)
- When `onComplete` is called, navigate to `/game/${gameId}` before or after calling the callback

### 2. Update Index.tsx (optional enhancement)
**File:** `src/pages/Index.tsx`

No changes strictly required since navigation will happen inside MilestoneReveal. However, we could optionally pass a `lastSavedGameId` prop if we want more control.

---

## Technical Details

```text
MilestoneReveal Component Changes:

┌─────────────────────────────────────────────────┐
│ import { useNavigate } from 'react-router-dom'  │
├─────────────────────────────────────────────────┤
│ const navigate = useNavigate();                 │
│                                                 │
│ // Get gameId from first milestone              │
│ const gameId = milestones[0]?.gameId;           │
│                                                 │
│ const handleClose = () => {                     │
│   onComplete();                                 │
│   if (gameId) {                                 │
│     navigate(`/game/${gameId}`);                │
│   }                                             │
│ };                                              │
├─────────────────────────────────────────────────┤
│ X button: onClick={handleClose}                 │
│ Awesome! button: handleNext calls handleClose   │
└─────────────────────────────────────────────────┘
```

---

## Summary

| Location | Change |
|----------|--------|
| `MilestoneReveal.tsx` | Add navigation to game details on close/complete |

This is a minimal change that leverages the existing `gameId` data already present in the milestone objects.
