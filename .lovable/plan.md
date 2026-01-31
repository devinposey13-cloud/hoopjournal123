

# Improve PublicMilestoneCard Mobile Responsiveness

## Current Issues

After reviewing the code, the `PublicMilestoneCard` has these mobile responsiveness concerns:

1. **Fixed height (180px)** may cause text overflow on small screens when the milestone description is long
2. **Rarity badge text (10px)** may be too small on mobile
3. **Icon size (text-3xl)** could be optimized for compact mobile layouts
4. **No minimum width constraint** - cards can get very narrow on 2-column mobile grids
5. **Padding (p-4)** may be too generous for narrow mobile cards

## Proposed Changes

### File: `src/components/milestones/PublicMilestoneCard.tsx`

```text
Mobile-Optimized Layout:
+------------------------+
| [UNCOMMON]       [3×]  |  <- Smaller badges on mobile
|                        |
|        [🎯]            |  <- Slightly smaller icon
|   "Sharpshooter"       |  <- Truncated if too long
|                        |
| Made 2+ three-pointers |  <- Scrollable if needed
| in one game            |
+------------------------+
```

**Changes:**

1. **Use min-height instead of fixed height**: Change `h-[180px]` to `min-h-[160px] sm:min-h-[180px]` to allow cards to expand for longer content while maintaining consistency

2. **Responsive padding**: Change `p-4` to `p-3 sm:p-4` for tighter mobile padding

3. **Responsive icon size**: Change `text-3xl` to `text-2xl sm:text-3xl` for a slightly smaller icon on mobile

4. **Responsive badge sizing**: Adjust badge positioning with `top-1.5 left-1.5 sm:top-2 sm:left-2` 

5. **Name text handling**: Add `line-clamp-2` to the milestone name to prevent long titles from breaking layout

6. **Description text handling**: Add `line-clamp-3 sm:line-clamp-none` to limit description on mobile but show full text on larger screens

7. **Responsive margins**: Adjust `mt-4 mb-2` to `mt-3 mb-1.5 sm:mt-4 sm:mb-2`

### File: `src/pages/PublicProfile.tsx`

Update the milestones grid for better mobile spacing:

- Change `gap-4` to `gap-3 sm:gap-4` for tighter mobile gaps
- Keep `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` layout

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/milestones/PublicMilestoneCard.tsx` | Responsive padding, icon size, text handling, and min-height |
| `src/pages/PublicProfile.tsx` | Adjust grid gap for mobile |

## Visual Comparison

```text
BEFORE (Mobile 390px width)        AFTER (Mobile 390px width)
+----------+ +----------+          +----------+ +----------+
| [UNCOMMON]         [3×]|          |[UNCOM...]       [3×]|
|                       |          |                      |
|        [🎯]           |          |       [🎯]          |
|   "Sharpshooter"      |          |  "Sharpshooter"     |
|                       |          |                      |
| Made 2+ three-pointers|          | Made 2+ three-      |
| in one game           |  ----→   | pointers in one...  |
|                       |          |                      |
+----------+ +----------+          +----------+ +----------+
h=180px (may overflow)             min-h=160px (flexible)
p=16px (cramped)                   p=12px (comfortable)
```

## Technical Notes

- Using Tailwind responsive prefixes (`sm:`, `md:`) for clean mobile-first approach
- Line clamping uses `-webkit-line-clamp` which has excellent browser support
- Min-height allows cards to grow if content requires more space
- All changes follow the existing mobile-responsive patterns in the codebase (as noted in the style/responsive-interface memory)

