
# Bug Fix: Live Stats Capture 2PT/3PT Field Goal Tracking

## Problem Identified
The Live Stats Capture interface has a critical bug where adding made 2-point field goals incorrectly affects 3-point field goal counts (and vice versa), sometimes resulting in **negative shot attempts** which is impossible in basketball.

## Root Cause
There's a **data model mismatch** in how the stats are stored vs. displayed:

| What Happens | How Stats Are Stored | How Stats Are Displayed |
|-------------|---------------------|------------------------|
| 2PT Made | `fgMade += 1` | Shows `fgMade - threePtMade` |
| 3PT Made | `threePtMade += 1` | Shows `threePtMade` |

The code assumes `fgMade` is the **total of all field goals** (2PT + 3PT), but in reality it only tracks 2-pointers.

**Example causing negative numbers:**
- User records a 3PT made → `fgMade = 0`, `threePtMade = 1`
- Display calculates 2PT made as `0 - 1 = -1` ❌

## Solution
Update the **display logic** to match how the stats are actually stored. Since `fgMade` represents 2-point field goals only:
- Remove the incorrect subtraction in all 2PT display calculations
- Show `fgMade` and `fgAttempted` directly for 2-point stats
- Keep 3-point stats display unchanged

## Changes Required

### File: `src/components/LiveStatCapture.tsx`

**1. Fix the 2PT display header (line 607)**
```text
Current:  {currentStats.fgMade - currentStats.threePtMade}/{currentStats.fgAttempted - currentStats.threePtAttempted}
Fixed:    {currentStats.fgMade}/{currentStats.fgAttempted}
```

**2. Fix the 2PT percentage calculation (line 379)**
```text
Current:  const fgPct = currentStats.fgAttempted > 0 ? Math.round((currentStats.fgMade / currentStats.fgAttempted) * 100) : 0;
```
This line is actually correct for showing 2PT percentage, but it's labeled misleadingly as "fgPct" which implies all field goals.

**3. Fix the half stats 2PT percentage display (lines 586-588)**
```text
Current:  2PT: {currentStats.fgAttempted - currentStats.threePtAttempted > 0 
            ? Math.round(((currentStats.fgMade - currentStats.threePtMade) / (currentStats.fgAttempted - currentStats.threePtAttempted)) * 100) 
            : 0}%
Fixed:    2PT: {currentStats.fgAttempted > 0 
            ? Math.round((currentStats.fgMade / currentStats.fgAttempted) * 100) 
            : 0}%
```

## Summary of Edits

| Line | Change Description |
|------|-------------------|
| 586-588 | Remove subtraction in 2PT percentage calculation |
| 607 | Remove subtraction in 2PT made/attempted display |

This fix ensures:
- ✅ 2PT and 3PT field goals are tracked independently and correctly
- ✅ No negative shot attempts can occur
- ✅ Percentages calculate correctly for both shot types
