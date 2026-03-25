

## Fix: Route iOS Despia Apple Sign In Through OAuth Redirect

### Problem
The Apple JS SDK's `signIn()` resolves instantly (1ms) inside the Despia iOS WebView with no authorization data. The native Apple dialog never appears.

### Solution
For `isDespiaIOS()`, bypass the JS SDK entirely and route through the same OAuth redirect flow already used for Google Sign In on native iOS (via Despia's `oauth://` bridge).

### Changes

#### 1. `src/components/AuthForm.tsx` — Reorder Apple flow logic (~15 lines changed)

Replace lines 152–168 (the iOS JS SDK block) with:

```typescript
// ── iOS NATIVE: OAuth redirect via Despia system browser ──
// The Apple JS SDK does NOT work inside Despia WebView (resolves instantly
// with empty authorization). Use the same oauth:// bridge as Google.
if (isDespiaIOS()) {
  const redirectTo = getOAuthRedirectUri({ forNative: true });
  logAppleAuthEvent('flow_selected', {
    flow: 'native_oauth_redirect',
    reason: 'isDespiaIOS — JS SDK unsupported in WebView',
    redirectTo,
    configuredCallback: `${APP_ORIGIN}/auth/callback`,
  });
  updateAppleAuthMetadata({ flowType: 'native_oauth_redirect', redirectUri: redirectTo });

  logAppleAuthEvent('oauth_url_requested', { provider: 'apple', redirectTo });
  const oauthUrl = await getDirectOAuthUrl('apple', redirectTo);
  logAppleAuthEvent('oauth_url_received', { urlLength: oauthUrl.length, urlPrefix: oauthUrl.slice(0, 80) });

  logAppleAuthEvent('system_browser_opened');
  await openOAuthInSystemBrowser(oauthUrl);
  return;
}
```

Remove the `isDespiaIOS() && isAppleJSAvailable()` branch entirely — iOS Despia will **never** use the JS SDK. The existing Android native block (lines 170–185) remains unchanged. The JS SDK import (`signInWithAppleNative`) stays for potential future web use but is no longer called on iOS native.

#### 2. `src/pages/OAuthCallback.tsx` — Add Apple-specific diagnostic logging

In the existing callback handler, add logging that captures:
- Whether the callback is from Apple (check URL params/provider)
- Auth code presence
- Token exchange start/result
- Session established or failed
- The flow label: `native_oauth_redirect` vs `js_sdk`

This uses the existing `logAppleAuthEvent` imports already in OAuthCallback.tsx.

#### 3. `src/components/settings/AppleAuthDebugPanel.tsx` — Show flow path label

Add a "Flow Used" badge/label in the attempt detail view showing:
- `JS SDK` / `OAuth Redirect` / `Native Return Complete`

This is already partially there via `metadata.flowType` — just surface it more prominently.

#### 4. `src/lib/apple-auth.ts` — Add guard comment

Add a comment at the top of `signInWithAppleNative()` noting it must NOT be called from Despia iOS. No runtime guard needed since the call site in AuthForm.tsx no longer routes there.

### Final Flow Summary

| Platform | Flow | Callback Path |
|----------|------|---------------|
| iPhone (Despia) | OAuth redirect via `oauth://` bridge → system browser → Apple native dialog | `https://hoopjournal.me/auth/callback` |
| iPad (Despia) | Same as iPhone | `https://hoopjournal.me/auth/callback` |
| Web (hoopjournal.me) | Direct Supabase OAuth redirect | `https://hoopjournal.me/auth/callback` |
| Web (lovable.app) | Lovable broker | Current origin |

### Apple Client ID / Callback Audit
- **Client ID**: `com.hoopjournal.web` — used consistently everywhere
- **Callback for OAuth redirect**: `https://hoopjournal.me/auth/callback` — this goes to Supabase which uses its own callback (`supabase.co/auth/v1/callback`) configured in Apple Developer Console
- **JS SDK redirect** (`/auth/apple/callback`): No longer used on iOS native; only relevant if JS SDK is used on web
- **No conflicts**: The OAuth redirect flow uses Supabase's managed Apple callback, not the JS SDK callback

