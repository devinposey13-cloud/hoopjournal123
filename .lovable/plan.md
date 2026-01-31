
# Fix: Field Goals Display to Show Total FG (2PT + 3PT Combined)

## Problem Summary
On the Game Details page, the "Field Goals" stat shows **only 2-point shots** (e.g., 3/6) instead of the **total field goals** (2PT + 3PT combined). The user example: 3/6 2PT and 2/4 3PT should display as **5/10 Total FG**.

The PDF export has the same issue - it's labeled "Total FG-FGA" but only shows the 2-point values.

## Current vs. Expected Behavior

| Scenario | 2PT Stats | 3PT Stats | Current Display | Expected Display |
|----------|-----------|-----------|-----------------|------------------|
| Field Goals | 3/6 | 2/4 | 3/6 (50%) | **5/10 (50%)** |
| 3-Pointers | — | 2/4 | 2/4 (50%) | 2/4 (50%) *(no change)* |

## Solution Overview
Calculate **Total FG** at display time by adding 2PT and 3PT stats together. The Live Stats Capture continues tracking them separately for granular data collection.

---

## Changes Required

### File 1: `src/pages/GameDetail.tsx`

**Update percentage calculations (lines 762-764)**

Add new variables for Total FG:
```typescript
// Calculate TOTAL field goals (2PT + 3PT combined)
const totalFgMade = game.fgMade + game.threePtMade;
const totalFgAttempted = game.fgAttempted + game.threePtAttempted;
const totalFgPct = totalFgAttempted > 0 
  ? Math.round((totalFgMade / totalFgAttempted) * 100) 
  : 0;
```

**Update Shooting Performance section (lines 905-910)**

Pass the combined totals to the Field Goals display:
```typescript
<ShootingStatBox
  label="Field Goals"
  made={totalFgMade}           // was: game.fgMade
  attempted={totalFgAttempted} // was: game.fgAttempted
  percentage={totalFgPct}      // was: fgPct
/>
```

**Update True Shooting calculation (lines 978-980)**

The True Shooting % formula should use Total FG attempts (it may already be correct if the original intent was total FG):
```typescript
// True Shooting uses total FG attempts
{totalFgAttempted + (0.44 * game.ftAttempted) > 0
  ? Math.round((game.points / (2 * (totalFgAttempted + 0.44 * game.ftAttempted))) * 100)
  : 0}%
```

---

### File 2: `src/utils/exportPdf.ts`

**Update PDF box score to use Total FG (lines 279-320)**

Calculate combined totals for the PDF:
```typescript
// Calculate TOTAL field goals for display
const totalFgMade = game.fgMade + game.threePtMade;
const totalFgAttempted = game.fgAttempted + game.threePtAttempted;
const totalFgPct = totalFgAttempted > 0 
  ? ((totalFgMade / totalFgAttempted) * 100).toFixed(1) 
  : '0.0';
```

Update the table body to use total values:
```typescript
// In body array (around line 297)
`${totalFgMade}-${totalFgAttempted}`,  // was: game.fgMade-game.fgAttempted

// In foot array (around line 314)  
`${totalFgMade}-${totalFgAttempted}`,  // was: game.fgMade-game.fgAttempted
```

**Update half-by-half shooting breakdown (around lines 380-400)**

The 2PT% breakdown should still show the actual 2PT stats (since it's explicitly labeled "2PT %"), but verify the Game totals use combined values for consistency.

---

## Summary of Edits

| File | Location | Change |
|------|----------|--------|
| `GameDetail.tsx` | Lines 762-764 | Add `totalFgMade`, `totalFgAttempted`, `totalFgPct` calculations |
| `GameDetail.tsx` | Lines 905-910 | Pass combined totals to ShootingStatBox |
| `GameDetail.tsx` | Lines 978-980 | Use `totalFgAttempted` in True Shooting formula |
| `exportPdf.ts` | Lines 279-282 | Add total FG calculation variables |
| `exportPdf.ts` | Lines 297, 314 | Use combined totals in table rows |

---

## What Stays the Same
- **Live Stats Capture**: Continues tracking 2PT and 3PT separately (buttons for "2PT Make", "3PT Make", etc.)
- **Database Storage**: `fg_made`/`fg_attempted` still stores 2PT; `three_pt_made`/`three_pt_attempted` stores 3PT
- **Half-by-half PDF breakdown**: Still shows "2PT %" and "3PT %" separately for detailed analysis

This ensures:
- **Game Details page** shows Total FG as users expect
- **PDF export** correctly represents Total FG-FGA
- **Data collection** remains granular for future analysis
