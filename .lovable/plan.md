

## Problem

The OAuth flow currently uses `https://hoopjournal123.lovable.app` as the broker origin (`LOVABLE_APP_ORIGIN`). This domain appears in the iOS system dialog ("Hoop Journal Wants to Use lovable.app to Sign In" -- visible in your screenshot) and in redirect URLs. You want to use `hoopjournal.me` instead.

## Important Limitation

The `~oauth/initiate` broker endpoint is a Lovable-managed service that only runs on `*.lovable.app` domains. Your custom domain `hoopjournal.me` does not host this broker, so we **cannot** simply swap the broker URL to `hoopjournal.me/~oauth/initiate` -- it won't work.

However, what we **can** do is change the `redirect_uri` (the callback URL) to use `hoopjournal.me`, so after the OAuth flow completes, the user lands on your custom domain rather than lovable.app. The broker initiation still needs to go through lovable.app, but the visible callback redirect and the iOS dialog can be improved.

## What Controls the iOS Dialog

The iOS "Wants to Use X to Sign In" dialog shows the domain of the **OAuth provider's consent screen redirect**, which is determined by the `redirect_uri`. If we set `redirect_uri` to `https://hoopjournal.me/auth/callback`, the dialog should show `hoopjournal.me` instead of `lovable.app`.

## Plan

### 1. Update `LOVABLE_APP_ORIGIN` usage in AuthForm.tsx

- Keep `LOVABLE_APP_ORIGIN = 'https://hoopjournal123.lovable.app'` for the broker URL only (the `~oauth/initiate` endpoint)
- Add a new constant `CUSTOM_DOMAIN_ORIGIN = 'https://hoopjournal.me'`
- Change `callbackOrigin` and `redirectUri` to use the custom domain:
  - For native: `https://hoopjournal.me/auth/callback`
  - For web on custom domain: `https://hoopjournal.me/auth/callback`
  - For lovable.app/iframe: keep existing behavior

### 2. Update `handleCustomDomainOAuth`

```
callbackOrigin = native ? CUSTOM_DOMAIN_ORIGIN : window.location.origin;
redirectUri = `${callbackOrigin}/auth/callback`;
brokerUrl = `${LOVABLE_APP_ORIGIN}/~oauth/initiate?provider=...&redirect_uri=...`;
```

The broker stays on lovable.app, but the redirect after Google/Apple consent goes to `hoopjournal.me`.

### 3. Update OAuthCallback.tsx deep link

The `OAuthCallback` page on `hoopjournal.me` already exists (same codebase). No changes needed there -- it will receive tokens and handle the native deep-link handoff as before.

### 4. Ensure custom domain is configured

Your custom domain `hoopjournal.me` must be connected and active in project settings for this to work. The OAuth callback page at `hoopjournal.me/auth/callback` must be reachable.

## Files to Change

- **`src/components/AuthForm.tsx`**: Add `CUSTOM_DOMAIN_ORIGIN` constant, update `callbackOrigin` in `handleCustomDomainOAuth` and redirect URIs to prefer the custom domain.

