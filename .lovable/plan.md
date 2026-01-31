
# Extract Journal Header into Reusable Component

## Overview
Refactor the duplicated journal header code in `Index.tsx` into a single reusable `JournalHeader` component that includes the animated basketball decorations.

## Current State
- `src/components/JournalHeader.tsx` exists but has an older design (no animated basketballs)
- `src/pages/Index.tsx` has the header code duplicated in two places:
  - Lines 288-311 (empty dashboard state)
  - Lines 346-369 (games-logged state)
- Both headers are nearly identical, just with slightly different wrapper margins

## Changes

### 1. Update `src/components/JournalHeader.tsx`
Replace the existing component with the new animated design:

```text
Props:
- playerName?: string (for the subtitle)
- className?: string (for flexible margin control)

Features to include:
- Bouncing basketball watermark (animate-[bounce_3s_ease-in-out_infinite])
- "Dear Basketball," heading in Dancing Script font
- Decorative divider with pulsing basketball (animate-pulse)
- Dynamic subtitle: "{playerName}'s Journey" or "My Basketball Journey"
```

### 2. Update `src/pages/Index.tsx`
Replace both inline header blocks with the component:

```text
Empty state (around line 288):
- Replace 24-line header block with:
  <JournalHeader playerName={profile.name} className="mb-6" />

Games-logged state (around line 346):
- Replace 24-line header block with:
  <JournalHeader playerName={profile.name} />
```

## Benefits
- **DRY principle**: Single source of truth for header styling
- **Easier maintenance**: Future style changes only need one update
- **Consistent behavior**: Both states guaranteed to look identical
- **Cleaner code**: Removes ~40 lines of duplicated JSX from Index.tsx

## Technical Details
- No new dependencies required
- Component already imported in Index.tsx (just not used)
- Animations use Tailwind's built-in utilities (no CSS changes needed)
