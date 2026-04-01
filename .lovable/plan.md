

## Fix Android Google OAuth Return Flow

### Problem
After Google authentication completes on Android, the OAuth redirect lands on `https://hoopjournal.me/auth/callback` — which loads the full React SPA in the system browser instead of deep-linking back to the Despia native app. The user gets stuck on the website.

### Root Cause
The current native Google OAuth flow sets `redirectTo` to `https://hoopjournal.me/auth/callback`, which is a React route. According to Despia documentation, native OAuth flows should redirect to a **static HTML `/native-callback` page** that instantly extracts tokens from the URL and redirects to the app's deep-link scheme (`hoopjournal://oauth/auth?tokens`). This deep-link closes the secure browser session and hands control back to the app.

### Plan

**1. Create `public/native-callback.html` — static HTML callback page**
- A standalone HTML file (not a React route) that renders a branded spinner immediately
- Inline JavaScript parses tokens from the URL hash/query (`access_token`, `refresh_token`, `error`)
- Immediately redirects to `hoopjournal://oauth/auth/callback?access_token=...&refresh_token=...`
- Uses the app's dark theme (`#141a23`) to match branding
- No React, no bundle.js dependency — renders and redirects in milliseconds

**2. Update `src/components/AuthForm.tsx` — change Android redirect target**
- In `handleGoogleSignIn`, when `isNativeApp()` is true, change the `redirectTo` from `https://hoopjournal.me/auth/callback` to `https://hoopjournal.me/native-callback`
- iOS flow remains unchanged (it already works via the OAuth bridge pattern)
- Specifically: update `getOAuthRedirectUri({ forNative: true })` call or override for Android

**3. Update `src/lib/authConfig.ts` — add Android-specific redirect helper**
- Add a `getNativeCallbackUri()` function that returns `https://hoopjournal.me/native-callback` for use in the Android Google OAuth flow
- Keep `getOAuthRedirectUri({ forNative: true })` unchanged for iOS compatibility

**4. Add `native-callback` to backend redirect allowlist**
- Ensure `https://hoopjournal.me/native-callback` is in the authentication redirect URL allowlist (it may need to be added via Lovable Cloud auth settings)

### How the Fixed Flow Works

```text
Current (broken):
  despia('oauth://') → Google → hoopjournal.me/auth/callback → full SPA loads in browser → stuck

Fixed:
  despia('oauth://') → Google → hoopjournal.me/native-callback → static HTML extracts tokens
  → redirects to hoopjournal://oauth/auth/callback?tokens → browser closes → app resumes
```

### Files Changed
- `public/native-callback.html` — new static HTML callback page
- `src/components/AuthForm.tsx` — use `/native-callback` redirect for Android native
- `src/lib/authConfig.ts` — add native callback URL constant

### Manual Step Required
- Add `https://hoopjournal.me/native-callback` to the authentication redirect URL allowlist in Lovable Cloud settings

