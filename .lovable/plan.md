

# Responsive Navigation: Desktop Top + Mobile Bottom

## Overview

Add responsive behavior so the **top navigation bar** displays on desktop screens (768px+) and the **bottom navigation bar** displays on mobile screens (<768px). Both components already exist - we just need to conditionally render them.

---

## Current State

| Component | Status | Currently Used |
|-----------|--------|----------------|
| `Navigation.tsx` | Exists (top bar) | Not rendered |
| `BottomNavigation.tsx` | Exists (bottom bar) | Rendered always |
| `useIsMobile()` hook | Exists | Available but unused for nav |

---

## Changes Required

### File: `src/pages/Index.tsx`

**What changes:**
1. Import the `Navigation` component (top bar)
2. Use the existing `useIsMobile()` hook (already imported)
3. Conditionally render:
   - Desktop (768px+): Show `Navigation` at top
   - Mobile (<768px): Show `BottomNavigation` at bottom
4. Adjust padding based on which nav is shown:
   - Desktop: `pt-0` (top nav is sticky, not fixed)
   - Mobile: `pb-20` (bottom nav is fixed)

**Visual Result:**

Desktop (768px and above):
```text
+---------------------------------------------------------------+
| [Logo]  [Dashboard][Games][Stats][Schedule]...   [Season ▼]   |
+---------------------------------------------------------------+
|                        (Page Content)                          |
|                                                                |
+---------------------------------------------------------------+
```

Mobile (below 768px):
```text
+---------------------------------------------------------------+
|                        (Page Content)                          |
|                                                                |
+---------------------------------------------------------------+
|   [Dashboard]   [Log]   [Progress]   [Coach]   [More]         |
+---------------------------------------------------------------+
```

---

## Technical Implementation

### Key Code Changes in Index.tsx

```typescript
// Already imported:
import { useIsMobile } from '@/hooks/use-mobile';

// Add import:
import { Navigation } from '@/components/Navigation';

// In component (isMobile is already defined):
const isMobile = useIsMobile();

// In return JSX:
return (
  <div className={cn(
    "min-h-screen bg-background",
    isMobile ? "pb-20" : ""
  )}>
    {/* Desktop: Top Navigation */}
    {!isMobile && (
      <Navigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        seasons={seasons}
        activeSeason={activeSeason}
        onSeasonChange={switchSeason}
        onCreateSeason={async (name) => { await createSeason(name); }}
        onDeleteSeason={deleteSeason}
        isAdmin={isAdmin}
      />
    )}

    {/* Mobile: Bottom Navigation */}
    {isMobile && (
      <BottomNavigation ... />
    )}

    <main>...</main>
  </div>
);
```

---

## Files to Modify

**`src/pages/Index.tsx`**
- Add import for `Navigation` component
- Add conditional rendering based on `isMobile`
- Update container padding to be responsive
- Apply same pattern in loading state render

---

## Tab Mapping Note

The desktop `Navigation` uses actual tab IDs (`games`, `stats`) while the mobile `BottomNavigation` displays friendly names (`Log`, `Progress`) that map to the same tabs. This ensures consistent behavior regardless of which navigation is visible.

---

## What Stays Unchanged

- `Navigation.tsx` - No modifications needed
- `BottomNavigation.tsx` - No modifications needed  
- `MoreMenu.tsx` - No modifications needed
- All page content and business logic
- All existing routes and features

