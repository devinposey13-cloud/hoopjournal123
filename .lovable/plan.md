

# Fix: OAuth Flow on Custom Domain (hoopjournal.me)

## Root Cause

I traced through the `@lovable.dev/cloud-auth-js` library source code and found the exact problem:

When a user clicks "Continue with Google" on **hoopjournal.me**, the OAuth SDK does this:

```
window.location.href = "/~oauth/initiate?provider=google&redirect_uri=https://hoopjournal.me&state=..."
```

This navigates to `https://hoopjournal.me/~oauth/initiate` -- but **the `/~oauth` route only exists on `*.lovable.app` domains**, not on your custom domain. The custom domain serves your React app, which catches that unknown route and shows a "Not Found" page (or silently does nothing). That's why it "never navigates to Google."

On **mobile**, the same thing happens -- the OAuth initiation fails because `/~oauth/initiate` doesn't resolve on the custom domain. If a user previously logged in via `hoopjournal123.lovable.app` and then visits `hoopjournal.me`, the session cookie is domain-bound and doesn't carry over.

**The auth logs confirm this:** all successful Google logins have `referer: https://hoopjournal123.lovable.app`, never `hoopjournal.me`.

## Solution

When on the custom domain, bypass the relative `/~oauth/initiate` path and redirect directly to the full `hoopjournal123.lovable.app/~oauth/initiate` URL. The `redirect_uri` stays as `hoopjournal.me` so the user returns to your custom domain after authentication. The existing `detectSessionInUrl: true` setting will pick up the tokens from the URL.

```text
CURRENT (broken):
User on hoopjournal.me --> /~oauth/initiate (404!) --> nothing happens

FIXED:
User on hoopjournal.me --> https://hoopjournal123.lovable.app/~oauth/initiate --> Google --> back to hoopjournal.me with tokens
```

## What Changes

### 1. Update `AuthForm.tsx` -- Custom Domain OAuth Redirect

Add detection for custom domain and redirect to the absolute lovable.app broker URL:

- Detect custom domain: hostname does NOT include `lovable.app` or `lovableproject.com`
- When on custom domain, build the OAuth URL manually using `https://hoopjournal123.lovable.app/~oauth/initiate`
- Pass `redirect_uri` as `window.location.origin` (the custom domain) so the user returns there
- Generate a CSRF `state` parameter for security
- When NOT on custom domain, use the existing `lovable.auth.signInWithOAuth()` as before

Both Google and Apple buttons get this same fix.

### 2. Update `index.html` -- Extend Service Worker Bypass

Extend the existing `/~oauth` service worker unregister script to also handle hash-based token callbacks. When the URL contains `access_token` or `refresh_token` in the hash (which happens on the OAuth return), also bypass the service worker to prevent the Progressier PWA from caching or intercepting the token handoff.

### 3. Update `App.tsx` -- Enhanced Token Detection on Return

Add logic to detect when the app loads with OAuth tokens in the URL hash on the custom domain. This ensures `supabase.auth.getSession()` processes the tokens before the auth state check renders the login form.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/AuthForm.tsx` | Add custom domain detection; redirect to absolute lovable.app broker URL for Google and Apple sign-in |
| `index.html` | Extend SW bypass to also cover token-bearing callback URLs |

## Important Notes

- The `src/integrations/lovable/index.ts` file is auto-generated and will NOT be modified
- The `redirect_uri` (hoopjournal.me) must be in the allowed redirect URLs list in the authentication settings. You may need to verify this in your backend settings
- The existing service worker cache clearing before OAuth initiation is kept as-is
- All existing email/password auth continues to work unchanged

