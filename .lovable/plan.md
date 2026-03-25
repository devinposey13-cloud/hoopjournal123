

## Fix: "User not found after registration conflict" in Apple Auth

### Root Cause

The `listUsers({ filter: userEmail, perPage: 1 })` call on line 149 doesn't work — the Supabase Admin JS SDK's `listUsers` does **not** support a `filter` parameter. It's silently ignored, so `perPage: 1` just returns the first user in the database alphabetically. That user doesn't match the email, so the lookup fails with "User not found after registration conflict."

This affects any existing user (like your Google-registered account) trying to sign in with Apple using the same email.

### Fix

**`supabase/functions/auth-apple-callback/index.ts`** — Eliminate the broken `listUsers` lookup entirely. Instead:

1. **Skip the user lookup** — Since we already know the email exists (the "already been registered" error confirms it), go straight to `generateLink({ type: 'magiclink', email: userEmail })`. This works regardless of how the user originally registered (Google, email, etc.) because it targets the email, not a user ID.

2. **Get `userId` from the session** — After `verifyOtp`, extract `userId` from `sessionData.session.user.id` instead of from the lookup. This is always accurate.

3. **Move the metadata update after session creation** — Use the `userId` obtained from the session to update Apple-specific metadata (display name, apple_user_id) if needed.

This removes the fragile user-lookup step entirely and makes Apple sign-in work for any existing account regardless of original provider.

### Files
- `supabase/functions/auth-apple-callback/index.ts`

