

## Problem Summary

When navigating to `/log/history`, `/log/schedule`, or `/log/new`, the navigation bar disappears because the `Log.tsx` page component was created without including the `Navigation` (desktop) or `BottomNavigation` (mobile) components.

## Solution

Add the navigation components to the Log page, matching the same structure used in Index.tsx.

## Implementation Steps

### 1. Update `src/pages/Log.tsx`

Add the missing navigation components:

- Import `Navigation` and `BottomNavigation` components
- Import additional hooks needed for navigation props (`useGameWithMilestones` for seasons data, `useAdmin` for admin status)
- Conditionally render `Navigation` on desktop and `BottomNavigation` on mobile
- Pass all required props (seasons, activeSeason, onSeasonChange, onCreateSeason, onDeleteSeason, isAdmin)
- Set the `activeTab` to `'games'` since we're in the Log section (which maps to the "Log" display tab)

### 2. Code Changes

The Log.tsx file will be updated to include:

```text
Structure:
+--------------------------------------------+
|  Navigation (desktop only)                 |
+--------------------------------------------+
|  LogSection content (games/schedule/add)   |
+--------------------------------------------+
|  BottomNavigation (mobile only)            |
+--------------------------------------------+
```

Key additions:
- Import `Navigation` and `BottomNavigation`
- Import `useGameWithMilestones` hook for season data
- Import `useAdmin` hook for admin status
- Wrap content in responsive container with proper padding
- Add conditional rendering for desktop/mobile navigation

## Technical Details

The navigation components require these props:
- `activeTab`: Will be set to `'games'` (the underlying tab for "Log")
- `onTabChange`: Handler to switch tabs (will navigate or update state)
- `seasons`, `activeSeason`, `onSeasonChange`, `onCreateSeason`, `onDeleteSeason`: Season management
- `isAdmin`: Boolean for showing admin tab in More menu

