

## Analysis: iPad Apple Sign-In Inconsistency

### Root Cause

The iPad currently uses `lovable.auth.signInWithOAuth('apple', ...)` which triggers a **full-page redirect** through the Lovable OAuth broker (`/~oauth`). The inconsistency stems from a race condition in how the callback is processed:

1. **Success case**: The broker redirects back to `https://hoopjournal.me/auth/callback` with a PKCE `code` param. `OAuthCallback.tsx` captures it, calls `exchangeCodeForSession`, session is established, user is redirected home.

2. **Failure case (blank white screen)**: The redirect lands on `/auth/callback` but the code/tokens are missing or already consumed. The page enters the "waiting for auto-detection" branch, which times out after 8 seconds showing a blank/spinner. The 8-second timeout is the *only* fallback, and there is no iPad-specific watchdog (the existing watchdog only runs for `isNativeApp() && isDespiaIOS()`, which iPads no longer match).

3. **Refresh behavior**: When refreshing the blank screen, the user hits `/auth/callback` again with no tokens, so the flow restarts and may redirect back to Apple login.

### Why It's Intermittent

- The Lovable broker redirect sometimes includes the code in query params (works), sometimes the browser caches/strips them (fails)
- iPad Safari's Intelligent Tracking Prevention (ITP) can interfere with cross-origin cookie/token passing
- The Progressier service worker may occasionally cache the `/auth/callback` route, serving a stale response without tokens

### Plan: Make iPad Auth Reliable

#### 1. Add iPad-specific watchdog to OAuthCallback.tsx
Extend the existing iOS-native watchdog to also cover iPad Safari. Currently it only fires for `isNativeApp() && isDespiaIOS()`. Add a separate watchdog for iPad web that:
- Polls `supabase.auth.getSession()` every 2 seconds
- If a session is found, immediately redirects to `/`
- Times out after 15 seconds and shows a retry button

#### 2. Increase auto-detection timeout for iPad
The current 8-second `waitForSession` timeout is too short for iPad where ITP and service worker interference can delay token processing. Increase to 12 seconds on iPad.

#### 3. Add explicit retry on blank screen
When the auto-detection times out, instead of just showing an error, automatically retry `getSession()` one more time before giving up. This handles the case where the Supabase client processed the tokens slightly after the timeout.

#### 4. Ensure service worker doesn't cache callback route
Verify the Progressier service worker configuration doesn't intercept `/auth/callback`. Add a `nonce` query parameter to the redirect URI to bust any cached responses.

### Files to Modify

| File | Change |
|---|---|
| `src/pages/OAuthCallback.tsx` | Add iPad watchdog, increase timeout, add auto-retry |
| `src/components/AuthForm.tsx` | Add cache-busting nonce to redirect_uri for iPad |

### Technical Details

**iPad detection** in OAuthCallback:
```typescript
const isIPad = /iPad|Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document;
```

**Watchdog extension** — run for both native iOS AND iPad web:
```typescript
if ((isNativeApp() && isDespiaIOS()) || isIPad) {
  // existing watchdog logic
}
```

**Cache-busting redirect_uri**:
```typescript
const redirectUri = isCustomDomain()
  ? `${window.location.origin}/auth/callback?ts=${Date.now()}`
  : window.location.origin;
```

