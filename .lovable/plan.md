

## Analysis: iPad Apple Sign-In in TestFlight

### Current State

You are correct. The current implementation **intentionally routes iPad differently from iPhone**, even when both run inside the Despia native shell (TestFlight). Here's the exact logic in `AuthForm.tsx` line 177:

```typescript
const isIPhone = isIOSNative && /iphone/i.test(navigator.userAgent);
if (isIPhone) {
  signInWithAppleRedirect(); // Native form_post flow
  return;
}
// iPad falls through to lovable.auth.signInWithOAuth('apple', ...) — web redirect flow
```

So even though `isDespiaIOS()` returns `true` for iPad (it checks for both `iphone` and `ipad` in the UA), the auth form adds a second gate that only lets iPhone through to the native redirect. iPad gets the **web-based Lovable OAuth broker flow**, which causes:

- A full-page redirect chain through `lovable.app/~oauth` → Apple → back to callback
- PKCE token exchange that's fragile in WKWebView due to ITP and cookie partitioning
- The intermittent white screen you're seeing

### Why It Was Done This Way

This was introduced as a workaround because `signInWithAppleRedirect()` (the native flow) was also hanging on iPad. That flow uses Apple's `form_post` response mode → edge function → HTML page with meta-refresh back to the app. The meta-refresh was unreliable in iPad WKWebView.

However, **the same flow works on iPhone**, which means the root issue isn't the flow itself but likely a subtle difference in how iPad WKWebView handles the redirect. The web OAuth fallback made things worse, not better.

### Plan: Unify iPhone + iPad Native Auth

#### 1. Remove the iPhone-only gate in AuthForm.tsx
Change the condition from checking for "iphone" UA to using `isDespiaIOS()` directly, so both iPhone and iPad use `signInWithAppleRedirect()`.

```text
Before: const isIPhone = isIOSNative && /iphone/i.test(navigator.userAgent);
After:  if (isIOSNative) { signInWithAppleRedirect(); return; }
```

#### 2. Remove iPad-specific workarounds from OAuthCallback.tsx
The iPad watchdog polling and extended timeouts were added for the web OAuth flow. Since iPad will now use the native redirect flow (same as iPhone), these are no longer needed for iPad. Keep the existing iOS-native watchdog which already covers both.

#### 3. Remove iPad cache-busting nonce from AuthForm.tsx
The `?ts=${Date.now()}` appended to the redirect URI for iPad is no longer relevant since iPad won't use the Lovable OAuth broker flow.

#### 4. Ensure the edge function HTML response works on iPad
The `auth-apple-callback` edge function already returns an HTML page with both meta-refresh and JS fallback. This is the same response iPhone gets successfully. No changes needed here, but if issues persist, we can add a more aggressive JS redirect with a short delay as a tertiary fallback.

### Files to Modify

| File | Change |
|---|---|
| `src/components/AuthForm.tsx` | Remove `/iphone/i` check; use `isIOSNative` for both iPhone+iPad. Remove iPad cache-busting nonce. |
| `src/pages/OAuthCallback.tsx` | Remove `isIPadWeb` watchdog branch (iPad in Despia is now handled by the existing iOS-native watchdog). |

### Expected Outcome

- **iPhone TestFlight**: No change — continues using `signInWithAppleRedirect()`
- **iPad TestFlight**: Now uses `signInWithAppleRedirect()` (same as iPhone) instead of the unreliable web OAuth broker
- **Web/PWA (desktop + mobile Safari)**: No change — continues using `lovable.auth.signInWithOAuth('apple')`

### Risk Note

If the meta-refresh HTML response from the edge function still hangs on iPad WKWebView, the existing iOS-native watchdog (polling `getSession()` every 2s) will catch it — this watchdog already runs for `isNativeApp() && isDespiaIOS()`, which includes iPad.

