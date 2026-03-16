

## Problem Analysis

Looking at the exported image, two issues are visible:

1. **Achievement tags ("Double", "Scoring Machine") overlap with the avatar** — the grade section's horizontal padding (60px each side) combined with the avatar (360px) and gap (48px) exceeds the safe zone width (920px), causing content to clip behind the avatar.
2. **The grade text "A+" is very large (250px)** which compresses poorly after Instagram's image processing.

### Root Cause
The side-by-side layout math: Avatar (360px) + gap (48px) + grade padding (120px) + grade text (~400px) = **~928px**, which overflows the 920px safe area. The tags beneath the grade spill left into the avatar region.

## Plan

### Fix `ReportCardCanvas.tsx`

1. **Reduce grade section padding** from `80px 60px` to `40px 20px` to prevent horizontal overflow.

2. **Constrain the grade column width** — add `maxWidth` and `overflow: hidden` so tags wrap within bounds instead of spilling behind the avatar.

3. **Slightly reduce the avatar size** from 360px to 320px (story) to give more breathing room while still being prominent.

4. **Increase tag font size slightly** (from 16px to 18px) for better post-compression readability.

5. **Add `minWidth: 0` to the grade flex child** to ensure proper flex shrinking behavior.

These changes keep the same visual design but fix the geometry so nothing overlaps or clips during export.

