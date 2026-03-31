

## Fix: Avatar Deletion Not Persisting

### Problem
When deleting an avatar, `handleDeleteAvatar` calls `updateProfile({ avatar: undefined })`. In `useCloudData.ts`, line 902 uses the nullish coalescing operator (`??`), which treats `undefined` as nullish and falls back to `profile.avatar` (the old URL). The database never receives `null`, so on refresh the old avatar reappears.

### Root Cause
```ts
avatar_url: updates.avatar ?? profile.avatar ?? null,
```
`undefined ?? profile.avatar` evaluates to `profile.avatar` — the old URL.

### Fix

**File: `src/hooks/useCloudData.ts`** (line 902)

Change the avatar field logic to explicitly check if `avatar` was included in the updates object:

```ts
avatar_url: 'avatar' in updates ? (updates.avatar ?? null) : (profile.avatar ?? null),
```

This way, when `handleDeleteAvatar` passes `{ avatar: undefined }`, the `'avatar' in updates` check is `true`, and `updates.avatar ?? null` resolves to `null` — correctly clearing the database field.

**File: `src/pages/Profile.tsx`** (line 209-210)

Also update the delete handler to pass `null` instead of `undefined` for clarity:

```ts
setFormData(prev => ({ ...prev, avatar: undefined }));
await updateProfile({ avatar: null as any });
```

### Also affected
The same `??` pattern applies to other fields, but avatar is the only one with an explicit delete flow, so this is the only one that needs fixing now.

### Summary
One line change in `useCloudData.ts` to use an explicit `'avatar' in updates` check, ensuring deletion properly writes `null` to the database.

