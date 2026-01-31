

# Plan: Hide Avatar Upload Card After Skipping + Display Avatar in Journal Header

## Overview

This update implements two connected features:
1. **Persist the "Skip for now" action** - When users click "Skip for now" on the avatar upload card, the preference is saved to the database so the card stays hidden permanently
2. **Display avatar in the "Dear Basketball" header** - Once a user has an avatar (uploaded or generated), show it next to the journal header text

---

## What You'll See

### After Clicking "Skip for now"
- The "Add a face to the journey" card disappears immediately
- A toast confirms: "No problem! You can add a photo anytime in Settings."
- The card won't reappear on page refresh or other devices
- You can still add your photo through the Settings panel anytime

### Avatar in Journal Header
- Once you have an avatar, it appears to the left of "Dear Basketball"
- The header shifts to a side-by-side layout with the avatar
- Without an avatar, the header remains centered as it currently is

---

## Technical Details

### 1. Database Change

Add a new column to the `player_settings` table:

| Column | Type | Default |
|--------|------|---------|
| `avatar_skipped_at` | timestamp with time zone | null |

This timestamp records when the user dismissed the avatar prompt. If set, the avatar upload card stays hidden.

### 2. Type Updates

**`src/types/basketball.ts`** - Add to PlayerProfile:
```typescript
avatarSkippedAt?: string;
```

### 3. Data Layer Updates

**`src/hooks/useCloudData.ts`**:
- Read `avatar_skipped_at` when loading profile data (around line 211)
- Write `avatar_skipped_at` when updating profile (around line 738)

### 4. Component Updates

**`src/components/EmptyDashboardWelcome.tsx`**:
- Add `hasSkippedAvatar?: boolean` prop
- When `hasSkippedAvatar` is true AND no avatar exists, hide the entire avatar upload card

**`src/pages/Index.tsx`**:
- Pass `hasSkippedAvatar={Boolean(profile.avatarSkippedAt)}` to EmptyDashboardWelcome
- Update `onSkipPhoto` to save the timestamp:
```typescript
onSkipPhoto={() => {
  updateProfile({ avatarSkippedAt: new Date().toISOString() });
  toast.info("No problem! You can add a photo anytime in Settings.");
}}
```

**Dashboard Header** (in `src/pages/Index.tsx` - lines 285-302 and 333-349):
- Update the inline journal header to show avatar when available
- Create a flex layout with avatar on the left, text on the right
- Keep centered text-only layout when no avatar exists

### 5. Header Layout Changes

The "Dear Basketball" header section currently looks like:
```text
        Dear Basketball,
        ──────────────
       Player's Journey
```

With an avatar, it will become:
```text
┌──────┐
│ 👤  │  Dear Basketball,
│avatar│  ──────────────
└──────┘  Player's Journey
```

The avatar will be:
- Circular with a subtle border matching the journal aesthetic
- Sized appropriately (80-96px diameter)
- Positioned to the left on larger screens
- Stacked above on mobile for proper responsiveness

---

## Implementation Sequence

1. **Database migration** - Add `avatar_skipped_at` column to `player_settings`
2. **Type update** - Add `avatarSkippedAt` to PlayerProfile interface
3. **Hook update** - Read/write the new field in useCloudData
4. **EmptyDashboardWelcome update** - Accept and handle `hasSkippedAvatar` prop
5. **Index page updates**:
   - Pass skip status to EmptyDashboardWelcome
   - Update onSkipPhoto handler
   - Add avatar display to both journal header sections (empty state and with games)

---

## Edge Cases Handled

- **User uploads photo later**: The avatar will appear in the header; the upload card remains hidden (skipped preference stays)
- **User deletes their avatar**: The upload card stays hidden because they previously skipped; they can re-add via Settings
- **User already has avatar**: Upload card is already hidden; avatar shows in header
- **New users who don't skip**: Upload card continues to show until they upload or skip
