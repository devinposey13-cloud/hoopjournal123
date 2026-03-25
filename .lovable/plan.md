

## Critical Finding: Wrong Apple Auth Architecture

### What Despia Documentation Says

The Despia docs at `setup.despia.com/lovable/native-features/o-auth-2-0/apple-auth` are explicit:

```text
Platform Strategy:
  iOS (Despia):    Apple JS SDK → Native Face ID dialog (instant)
  Android (Despia): oauth:// protocol → ASWebAuthenticationSession → form_post
  Web:             Apple JS SDK → Native browser dialog (instant)

Why Different Approaches:
  - iOS has native Apple Sign In support → Use JS SDK for instant dialog
  - Android has NO native Apple Sign In → Use oauth:// to trigger browser session
```

### What We're Currently Doing (Wrong)

We routed iOS to `supabase.auth.signInWithOAuth({ provider: 'apple' })` via the `oauth://` bridge — a redirect-based flow. This is wrong for two reasons:

1. **Despia says iOS should use the Apple JS SDK**, not OAuth redirects. The JS SDK triggers the native Face ID dialog instantly inside the WebView — no redirects, no blank screens.
2. **Apple will reject apps** that show blank screens during redirect-based OAuth (per Despia's blank-screen-redirects docs).

### Why the JS SDK Previously Failed

The JS SDK was initialized with `com.hoopjournal.web` (wrong client ID). It likely resolved instantly with empty authorization because Apple couldn't match the Service ID. Now that we've corrected the client ID to `com.despia.hoopjourney.AppleAuth`, the JS SDK should work.

### What Despia Recommends: Custom Edge Function

Despia's architecture uses a custom `auth-apple-callback` edge function (not Supabase's built-in OAuth). The flow:

1. JS SDK → get `id_token` + `code` from Apple (native Face ID dialog)
2. POST `id_token` to custom edge function
3. Edge function verifies token against Apple's JWKS
4. Edge function creates/finds user via Supabase Admin API
5. Edge function returns `access_token` + `refresh_token`
6. Frontend calls `supabase.auth.setSession()`

We don't have this edge function — it's missing entirely.

### Plan

#### 1. Create `supabase/functions/auth-apple-callback/index.ts`

Custom edge function following Despia's spec:
- Accepts both JSON (iOS/Web JS SDK) and form_post (Android oauth://)
- Verifies Apple `id_token` against Apple's JWKS (`https://appleid.apple.com/auth/keys`)
- Uses `APPLE_CLIENT_ID` secret for audience verification
- Creates or finds user via Supabase Admin API (`admin.createUser` / `admin.listUsers`)
- Generates session via `admin.generateLink` + `verifyOtp`
- Returns JSON `{ access_token, refresh_token }` for iOS/Web
- Returns 302 redirect with tokens for Android
- Uses existing secrets: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

#### 2. Revert `src/components/AuthForm.tsx` — iOS back to JS SDK

For `isDespiaIOS()`:
- Call `signInWithAppleNative()` (the JS SDK path in `apple-auth.ts`)
- On success, navigate to an auth-loading state
- POST the `id_token` to the new edge function
- Call `setSession()` with returned tokens
- Remove the `getDirectOAuthUrl('apple')` path for iOS

Keep `oauth://` redirect only for Android (which has no native Apple support).

#### 3. Update `src/lib/apple-auth.ts`

- Remove the Despia iOS guard (it should be callable from iOS again)
- After JS SDK returns `id_token`, POST to the edge function instead of using `supabase.auth.signInWithIdToken`
- Add comprehensive error capture so failures appear in the debug panel
- Ensure the `APPLE_CLIENT_ID` from `authConfig.ts` is used for SDK init

#### 4. Add `APP_URL` secret

The edge function needs `APP_URL` (e.g., `https://hoopjournal.me`) for Android redirect fallbacks. Request this secret.

#### 5. Update debug panel logging

Ensure the audit trail captures:
- Which flow was selected (JS SDK vs OAuth redirect)
- Edge function URL called
- Edge function response status
- Session establishment result

### Final Flow After Fix

| Platform | Flow | Blank Screen? |
|----------|------|---------------|
| iPhone (Despia) | JS SDK → Face ID → edge function → setSession | No |
| iPad (Despia) | JS SDK → Face ID → edge function → setSession | No |
| Android (Despia) | oauth:// → browser → form_post to edge function → deeplink | Minimal (loading screen) |
| Web (custom domain) | JS SDK → browser dialog → edge function → setSession | No |
| Web (lovable.app) | JS SDK → browser dialog → edge function → setSession | No |

### Technical Detail

The edge function will use the `jose` library (available in Deno) to verify Apple's JWT:
```typescript
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";
const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const { payload } = await jose.jwtVerify(idToken, JWKS, {
  issuer: 'https://appleid.apple.com',
  audience: APPLE_CLIENT_ID,
});
```

Files changed: 4 new/modified
- `supabase/functions/auth-apple-callback/index.ts` (new)
- `src/components/AuthForm.tsx` (revert iOS to JS SDK)
- `src/lib/apple-auth.ts` (POST to edge function, remove iOS guard)
- `src/components/settings/AppleAuthDebugPanel.tsx` (minor label updates)

