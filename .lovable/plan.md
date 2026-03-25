

## Simplify Apple Auth Flow

### Problem
The Apple Sign-In code has accumulated significant diagnostic/audit overhead that runs on every login attempt. The `appleAuthAudit.ts` module (379 lines) is dynamically imported and executed at multiple points — in `AuthForm.tsx`, `OAuthCallback.tsx`, and `apple-auth.ts`. This adds latency through:

1. **Dynamic imports** of the audit module at tap time (`await import('@/lib/appleAuthAudit')`) — blocks the login flow
2. **Excessive logging** at every stage (10+ audit calls per login)
3. **379-line audit module** that was explicitly marked as "TEMPORARY: Remove after Apple Sign In issues are resolved"
4. **Apple JS SDK initialization** on app boot even on iOS where it's never used (already guarded but still imported)

Google auth works well because it has none of this overhead.

### Plan

**1. Remove the audit trail system** (`src/lib/appleAuthAudit.ts`)
- Delete the file entirely — it was marked temporary
- Remove the admin debug panel (`src/components/settings/AppleAuthDebugPanel.tsx`) and its references in settings

**2. Strip audit calls from `AuthForm.tsx` (handleAppleSignIn)**
- Remove the `await import('@/lib/appleAuthAudit')` dynamic import at the top of the handler (this blocks before any auth work starts)
- Remove all `logAppleAuthEvent`, `updateAppleAuthMetadata`, `startAppleAuthAttempt`, `completeAppleAuth*` calls
- Keep the 3 platform branches (Android/iOS/Web) — those are the actual auth logic

**3. Strip audit calls from `OAuthCallback.tsx`**
- Remove the `await import('@/lib/appleAuthAudit')` block (lines 77-98) that runs on every callback
- Remove the Apple audit completion in `handleSessionEstablished` (lines 299-307)
- Keep all session establishment logic unchanged

**4. Strip audit calls from `apple-auth.ts`**
- Remove `logAppleAuthEvent`, `updateAppleAuthMetadata`, `maskToken` imports and all their calls
- Keep the actual auth logic (token exchange, setSession, redirect URL building)

**5. Remove `AppleAuthDebugPanel` from settings**
- Remove import and usage from `src/components/SettingsPanel.tsx` (or wherever it's referenced)

### Files to modify
- **Delete**: `src/lib/appleAuthAudit.ts`
- **Delete**: `src/components/settings/AppleAuthDebugPanel.tsx`
- **Edit**: `src/components/AuthForm.tsx` — remove audit imports/calls from `handleAppleSignIn`
- **Edit**: `src/pages/OAuthCallback.tsx` — remove audit imports/calls
- **Edit**: `src/lib/apple-auth.ts` — remove audit imports/calls
- **Edit**: `src/components/SettingsPanel.tsx` — remove debug panel reference

### What stays the same
- The 3 platform-specific Apple auth paths (iOS redirect, Android OAuth, Web JS SDK)
- The `auth-apple-callback` edge function
- The `OAuthCallback` session establishment logic
- Google auth (untouched)
- The pre-hydration shell suppression fix

### Result
The Apple sign-in tap will go directly to the platform-appropriate auth flow without awaiting dynamic imports or writing audit logs, matching the simplicity and speed of the Google flow.

