
# Navigation UI Refactor

## Overview

Refactor the main navigation to a clean, mobile-first 5-tab bottom navigation bar. This change is UI-only and preserves all existing pages, routes, and business logic.

---

## New Navigation Structure

```text
+---------------------------------------------------------------+
|                        (Page Content)                          |
+---------------------------------------------------------------+
|                                                               |
|   [Dashboard]   [Log]   [Progress]   [Coach]   [More]         |
|       Home     Book+     TrendUp    MessageCir  MoreHoriz     |
|                                                               |
+---------------------------------------------------------------+
```

### Tab Mapping

| New Tab | Icon | Routes To |
|---------|------|-----------|
| **Dashboard** | `LayoutDashboard` | Current dashboard view (home stats, recent games) |
| **Log** | `ClipboardPlus` | Current games tab (log/view games) |
| **Progress** | `TrendingUp` | Current stats tab (statistics page) |
| **Coach** | `MessageCircle` | Current coach tab (Coach AI) |
| **More** | `MoreHorizontal` | Sheet/menu with: Schedule, Clips, Milestones, Play, Settings, Admin |

---

## What Gets Created

### 1. New Bottom Navigation Component
**File:** `src/components/BottomNavigation.tsx`

A fixed bottom navigation bar that:
- Stays pinned to the bottom of the screen
- Shows 5 icons with labels below
- Highlights the active tab with primary color
- Works seamlessly on mobile and desktop
- Includes safe area padding for iOS devices

### 2. "More" Menu Sheet
**File:** `src/components/MoreMenu.tsx`

A slide-up sheet (using existing Sheet component) containing:
- Schedule (calendar icon)
- Clips (video icon)
- Milestones (trophy icon)
- Play (gamepad icon)
- Settings (cog icon)
- Admin (shield icon) - only if user is admin
- Season selector at the bottom

---

## What Changes

### Navigation.tsx
- **Kept as-is** for potential desktop use or future reference
- Could be hidden on mobile, shown on desktop (optional)

### Index.tsx
- Import new `BottomNavigation` component
- Replace top Navigation with BottomNavigation (or show both with responsive visibility)
- Move Season Selector into the More menu
- Adjust bottom padding on main content area to account for fixed bottom nav (`pb-20` instead of `pb-14`)

---

## Visual Design

### Bottom Nav Bar
```text
Height: 64px (h-16)
Background: bg-background/95 backdrop-blur-lg
Border: border-t border-border
Position: fixed bottom-0 left-0 right-0
Safe area: pb-safe (iOS notch support)
```

### Tab Buttons
```text
Active: text-primary, icon filled/bold
Inactive: text-muted-foreground
Label: text-xs font-medium
Icon: w-5 h-5
Spacing: flex-1 (equal distribution)
```

### More Menu
```text
Sheet from bottom
Max height: 70vh
Grid layout: 2 columns for menu items
Each item: icon + label, clickable
```

---

## Files to Create

1. **`src/components/BottomNavigation.tsx`**
   - Fixed bottom nav with 5 tabs
   - Handles active state highlighting
   - Opens MoreMenu sheet when "More" is tapped

2. **`src/components/MoreMenu.tsx`**
   - Sheet component with secondary navigation items
   - Season selector embedded
   - Closes on item selection

---

## Files to Modify

1. **`src/components/Navigation.tsx`**
   - Update Tab type to include new mapping OR keep for desktop
   - Add "log" and "progress" as valid tab values

2. **`src/pages/Index.tsx`**
   - Replace/augment Navigation with BottomNavigation
   - Adjust content padding for bottom nav
   - Handle tab switching from MoreMenu items

---

## Tab Type Updates

```typescript
// Current
type Tab = 'dashboard' | 'games' | 'stats' | 'schedule' | 'clips' | 
           'milestones' | 'minigames' | 'coach' | 'settings' | 'admin';

// After (aliases added for clarity)
type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 
           'schedule' | 'clips' | 'milestones' | 'minigames' | 
           'coach' | 'settings' | 'admin';

// Mapping:
// - 'log' maps to games tab content
// - 'progress' maps to stats tab content
```

---

## Mobile-First Behavior

- Bottom nav is always visible (except during fullscreen modals like Live Stats)
- No horizontal scrolling - exactly 5 equal-width tabs
- Touch-friendly 64px tap targets
- Smooth transitions between tabs

---

## What Stays Untouched

- All existing page components (GameCard, StatisticsPage, CoachChat, etc.)
- All existing hooks and data logic
- All existing routes in App.tsx
- All existing features and functionality
- Database interactions
- Auth flow

---

## Implementation Order

1. Create `BottomNavigation.tsx` with 5 static tabs
2. Create `MoreMenu.tsx` sheet with secondary items
3. Update `Navigation.tsx` Tab type to include new values
4. Update `Index.tsx` to render bottom nav and handle new tab IDs
5. Adjust page padding for fixed bottom nav
6. Test on mobile viewport

This is a purely visual navigation refactor with no business logic changes.
