

## Move Season Averages to Stats Predictor Widget

This plan integrates the season averages display directly into the Stats Predictor widget so players can reference their historical performance while making predictions for the upcoming game.

### What Will Change

**User Experience:**
- When making predictions, you'll see your season averages (PPG, RPG, APG) displayed directly above the prediction inputs
- This provides helpful context - you can see what you typically score and set realistic or stretch goals
- The season averages will be styled subtly so they don't distract from the main prediction action

**Visual Layout:**
- The standalone Season Averages card will be removed from the pregame page
- Season averages will appear as reference values inside the Stats Predictor widget
- Compact labels will show "Your Avg: X.X" above each prediction input

---

### Technical Details

**Files to Modify:**

1. **`src/components/PregamePredictor.tsx`**
   - Add optional `seasonStats` prop of type `SeasonStats`
   - Display season averages (PPG, RPG, APG) as reference values above the prediction inputs
   - In compact mode: Show small "Avg: X" labels above each input field
   - In full mode: Show averages in a reference row before the input grid
   - Handle empty state (no games played) gracefully

2. **`src/pages/GameDetail.tsx`**
   - Remove the standalone `<SeasonAveragesCard>` component from the pregame content section
   - Pass `seasonStats` prop to `<PregamePredictor>` component
   - Remove `SeasonAveragesCard` import if no longer used elsewhere

**Component Props Update:**
```typescript
interface PregamePredictorProps {
  scheduledGameId: string;
  opponent: string;
  compact?: boolean;
  seasonStats?: SeasonStats;  // New prop
}
```

**UI Design for Compact Mode:**
- Above each input (PTS, REB, AST), show a small muted label: "Avg: 12.5"
- Helps players make informed predictions without adding clutter

**UI Design for Full Mode:**
- Add a "Your Season Averages" reference row above the prediction inputs
- Display PPG, RPG, APG in subtle styling before the editable fields

