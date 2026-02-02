
# Add In-App Admin Notification Badge

## Overview
Add a visual notification badge to the Admin menu item that shows the count of pending account approval requests, pending content reports, pending password reset requests, and unread feedback. This provides a backup notification method so admins are aware of items needing attention without relying solely on email.

## What This Will Do
- Show a red notification badge on the "Admin" menu item in both mobile (MoreMenu) and desktop (Navigation) views
- The badge will display the total count of all pending admin items
- Updates in real-time when navigating to/from admin panel
- Only visible to admin users

## Technical Approach

### 1. Create a new hook: `useAdminNotifications`
Create `src/hooks/useAdminNotifications.ts` that fetches counts of pending items:
- Pending account approval requests
- Pending content reports  
- Pending password reset requests
- Unread user feedback

The hook will:
- Only run queries when user is an admin
- Return a `totalPending` count for the badge
- Include individual counts for granular display if needed
- Use Supabase realtime subscription for live updates (optional enhancement)

### 2. Update Navigation Components

**MoreMenu.tsx (Mobile)**
- Add badge next to "Admin" menu item showing pending count
- Use existing Badge component with destructive variant

**Navigation.tsx (Desktop)**
- Add badge in the dropdown menu next to "Admin" option
- Consistent styling with mobile version

**BottomNavigation.tsx (Mobile)**
- Add badge indicator on the "More" button when admin has pending items
- Small dot or number badge to draw attention

### 3. Component Updates

```text
+-------------------+
|  useAdminNotifications (new hook)
|  - Fetches pending counts
|  - Returns totalPending
+-------------------+
          |
          v
+-------------------+     +-------------------+
|   MoreMenu.tsx    |     |  Navigation.tsx   |
|   (mobile admin   |     |  (desktop admin   |
|    badge)         |     |   badge)          |
+-------------------+     +-------------------+
          |
          v
+-------------------+
| BottomNavigation  |
| (More button dot) |
+-------------------+
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useAdminNotifications.ts` | Create | New hook to fetch pending admin item counts |
| `src/components/MoreMenu.tsx` | Modify | Add badge to Admin menu item |
| `src/components/Navigation.tsx` | Modify | Add badge to Admin dropdown item |
| `src/components/BottomNavigation.tsx` | Modify | Pass notification count, show dot on More button |
| `src/pages/Index.tsx` | Modify | Use hook and pass count to navigation components |

## Visual Design

The badge will appear as:
- A small red circle with white text showing the count
- Positioned to the right of the "Admin" label
- Using the existing `Badge` component with `variant="destructive"`
- A subtle dot indicator on the "More" button when there are pending items

## Notes
- The hook will be efficient by only querying when the user is confirmed as an admin
- Badge will show "99+" if count exceeds 99 for compact display
- No database changes required - uses existing tables and RLS policies
