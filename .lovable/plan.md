
# Fix: Add Prominent Season Averages Display to Pregame Details Page

## Problem Identified
The season averages are technically present on the pregame page, but they're displayed as tiny 10px text labels ("Avg: X") above each prediction input in the compact `PregamePredictor` component. This makes them easy to miss.

You likely expected a **prominent, standalone Season Averages card** similar to what appears on the Dashboard.

## Current State
```text
+-------------------------------------------+
| Pregame Details Page                      |
+-------------------------------------------+
| • Countdown Timer                         |
| • Daily Quote                             |
| • Game Details (date, location)           |
| • Live Stat Capture Button                |
| • Spotify Player (if configured)          |
| • Pregame Talk (Coach AI)                 |
| • Stats Predictor (compact mode)          |
|   - Shows "Avg: 12.5" in tiny text above  |
|     each input field (easy to miss!)      |
+-------------------------------------------+
```

## Proposed Solution
Add the existing `SeasonAveragesCard` component **above the Stats Predictor** to prominently display your season performance. This gives you a clear reference point before making predictions.

```text
+-------------------------------------------+
| Pregame Details Page                      |
+-------------------------------------------+
| • Countdown Timer                         |
| • Daily Quote                             |
| • Game Details (date, location)           |
| • Live Stat Capture Button                |
| • Spotify Player (if configured)          |
| • Pregame Talk (Coach AI)                 |
| • *** SEASON AVERAGES CARD (NEW) ***      |  <-- Prominent display
|   - PPG, RPG, APG, SPG, BPG               |
|   - FG%, 3P%, FT%                         |
| • Stats Predictor (compact mode)          |
+-------------------------------------------+
```

## Implementation Steps

### Step 1: Import SeasonAveragesCard Component
Add the import for the existing `SeasonAveragesCard` component to `GameDetail.tsx`.

### Step 2: Add SeasonAveragesCard to Pregame Section
Place the `SeasonAveragesCard` component in the pregame content area, positioned **above** the `PregamePredictor`. Use the compact mode for a streamlined look that fits the page layout.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/GameDetail.tsx` | Import `SeasonAveragesCard` and add it above the `PregamePredictor` component |

## Technical Notes
- The `SeasonAveragesCard` component already exists and is used on the Dashboard
- It accepts a `compact` prop for a more streamlined display
- It handles the "no games played" state gracefully with a friendly message
- The `seasonStats` data is already being fetched via `useCloudData()` in `GameDetail.tsx`
