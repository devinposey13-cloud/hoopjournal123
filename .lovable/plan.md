

## Fix Inconsistent Sign Out Button on iOS

### Problem
The `handleSignOut` in `MoreMenu.tsx` fires `signOut()` (async) and immediately calls `onOpenChange(false)` to close the sheet. On iOS, the sheet animation and React state updates race with the async sign-out, causing the button to sometimes appear to do nothing or leave the user in a half-signed-out state.

### Solution
1. **`src/components/MoreMenu.tsx`** — Fix `handleSignOut`:
   - Close the sheet first (`onOpenChange(false)`) so the UI responds immediately
   - Then await `signOut()` after a short delay to let the sheet animation complete
   - Navigate to `/` after sign-out to ensure a clean redirect to the auth screen
   - Add a loading guard to prevent double-taps

### Changes

**`src/components/MoreMenu.tsx`**
- Add `signingOut` state to prevent double-tap
- Reorder: close sheet first, then sign out after a brief delay (~300ms for iOS sheet animation)
- Navigate to `/` after successful sign-out
- Disable the Sign Out button while `signingOut` is true

