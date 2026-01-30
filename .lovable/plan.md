
# Plan: Add Quick Live Stats Button to Schedule Tab

## Overview
Add a prominent "Live Stats" button on the Schedule tab that allows users to quickly jump into the Live Stat Capture interface without navigating through game details first. This is designed for users who are in a rush on game day and want to start tracking immediately.

## User Experience Flow

```text
+------------------+     +----------------------+     +-------------------+
|   Schedule Tab   | --> | Today's Game Found?  | --> | Live Stat Capture |
|  [Live Stats]    |     | Auto-select & start  |     | (Game in progress)|
+------------------+     +----------------------+     +-------------------+
                                  |
                                  v (No game today)
                         +----------------------+
                         | Quick Start Dialog   |
                         | - Enter opponent     |
                         | - Optional: date     |
                         +----------------------+
```

## Implementation Details

### 1. Add Quick Live Stats Button to Schedule Tab Header
**File:** `src/pages/Index.tsx`

- Add a new prominent button labeled "Live Stats" with a Radio icon in the Schedule tab header
- Position it alongside existing action buttons (Import Schedule, Add Schedule)
- Use the `gradient-primary` class for visual prominence
- Button triggers either:
  - Direct navigation to Live Stat Capture (if a game is scheduled for today)
  - Opens a "Quick Start" dialog (if no game today or multiple games today)

### 2. Create Quick Start Dialog Component
**New File:** `src/components/QuickLiveStatsDialog.tsx`

- A simple dialog with two modes:
  - **Auto-select mode:** If exactly one game is scheduled for today, show that game's info and a "Start Tracking" button
  - **Manual mode:** If no game today or multiple games, let user either select from today's games or enter an opponent name manually
- Fields:
  - Opponent name (required) - dropdown of today's games + manual entry option
  - Pre-fill date to today
- On submit: Navigate to a new "quick capture" route or directly render LiveStatCapture

### 3. Handle the Quick Start Flow
**Option A: Navigate to existing flow**
- Create a temporary scheduled game entry in the database with minimal info
- Navigate to `/game/scheduled/:newId` which shows the LiveStatCapture

**Option B: Direct render approach (simpler)**
- Store the quick-start state in component state on Index.tsx
- Render `LiveStatCapture` directly when triggered
- On save, the game is created with today's date and the provided opponent

### Recommended Approach: Option B (Direct Render)
This is cleaner because:
- No database pollution with temporary scheduled games
- Faster experience - no navigation needed
- Already have a pattern for this in GameDetail.tsx

### 4. Technical Changes

**`src/pages/Index.tsx`:**
- Add state: `showQuickLiveCapture: boolean` and `quickCaptureOpponent: string`
- Add the "Live Stats" button in the Schedule tab header
- Add the QuickLiveStatsDialog component usage
- Add conditional rendering of `LiveStatCapture` when `showQuickLiveCapture` is true
- Handle the save flow: create new game entry and show success

**`src/components/QuickLiveStatsDialog.tsx` (new file):**
- Props: `open`, `onOpenChange`, `todayGames: ScheduledGame[]`, `onStartCapture: (opponent: string, scheduledGameId?: string) => void`
- Show today's scheduled games if any
- Allow manual opponent entry
- Start button triggers the callback

### 5. UI Placement
The button will be placed in the Schedule tab header alongside existing actions:

```
Season Schedule                            [Live Stats] [Import] [Add Game]
X upcoming games
```

The "Live Stats" button should stand out as it's designed for quick access during game time.

---

## Technical Notes

- The `LiveStatCapture` component is already designed to work without a scheduled game context (uses `opponent` prop)
- The save handler in `LiveStatCapture` creates a new game entry in the database
- Today's games are already being filtered in the Schedule tab (`upcomingGames` includes today's games via `isToday()`)
- Will reuse the existing `addGame` function from `useGameWithMilestones` hook for saving

## Files to Create/Modify
1. **Create:** `src/components/QuickLiveStatsDialog.tsx`
2. **Modify:** `src/pages/Index.tsx` - Add button, dialog, and LiveStatCapture rendering logic
