

## Plan: Fix Quick Card Photo Upload & Generation

### Root Cause

The RLS policy on the `avatars` bucket requires the first folder in the file path to match the authenticated user's ID (`auth.uid()::text = (storage.foldername(name))[1]`). But `uploadPhoto` in AdminQuickMode uploads to `event-cards/...` — which doesn't match any user ID, so the insert is rejected with a 403.

### Fix

**1. `src/components/admin/AdminQuickMode.tsx`** — Change `uploadPhoto` to use the user's ID as the first folder segment:

```typescript
const { data: { user } } = await supabase.auth.getUser();
const path = `${user.id}/event-cards/${Date.now()}-${rand}.${ext}`;
```

This aligns with the existing RLS policy — no database migration needed.

### Files Modified
- `src/components/admin/AdminQuickMode.tsx` — fix upload path to include user ID prefix

