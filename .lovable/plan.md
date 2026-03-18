

## Root Cause

The code manually constructs URLs to Lovable's `/~oauth/initiate` broker via `buildBrokerUrl()`. This broker (`oauth.lovable.app`) is failing with "redirect_uri is required" because the manually-constructed parameters don't match what the broker expects internally. Since you have **your own Google OAuth credentials**, you don't need Lovable's broker at all.

## Fix: Bypass the Lovable OAuth broker entirely

Use `supabase.auth.signInWithOAuth` with `skipBrowserRedirect: true` to get the real Google OAuth URL directly from your backend, then open it via the existing bridge for native or redirect for web.

### Changes to `src/components/AuthForm.tsx`

**Replace `buildBrokerUrl` and `handleCustomDomainOAuth`** with a new approach:

1. Call `supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } })` to get the actual Google/Apple OAuth URL.
2. For **native**: wrap it in the `hoopjournal.me/oauth-bridge` trampoline (preserves the "hoopjournal.me" iOS dialog).
3. For **web custom domain**: redirect directly to the OAuth URL.

```text
Native flow:
  App → hoopjournal.me/oauth-bridge?broker_url=<google_oauth_url>
       → iOS shows "hoopjournal.me"
       → redirects to accounts.google.com/...
       → Google redirects to Supabase callback
       → Supabase redirects to hoopjournal123.lovable.app/auth/callback
       → OAuthCallback deep-links tokens to native app
```

Key code change in `handleCustomDomainOAuth`:
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider,
  options: {
    redirectTo: `${LOVABLE_APP_ORIGIN}/auth/callback`,
    skipBrowserRedirect: true,
  },
});
if (error || !data?.url) throw error || new Error('No OAuth URL');

const urlToOpen = isNativeApp()
  ? `${CUSTOM_DOMAIN_ORIGIN}/oauth-bridge?broker_url=${encodeURIComponent(data.url)}`
  : data.url;

await openOAuthInSystemBrowser(urlToOpen);
```

Remove `buildBrokerUrl` and `getManagedOAuthRedirectUri` helpers (no longer needed).

Update `handleIframePopupOAuth` to also use `supabase.auth.signInWithOAuth` with `skipBrowserRedirect: true` instead of manually constructing broker URLs.

### Required backend configuration

You must verify these settings in your Google Cloud Console and backend auth config:

1. **Google Cloud Console → Authorized redirect URIs:**
   - `https://jwoupnumuotmwpwrkmob.supabase.co/auth/v1/callback`

2. **Backend Auth → Redirect URLs (allow list):**
   - `https://hoopjournal.me/**`
   - `https://hoopjournal123.lovable.app/**`

3. **Backend Auth → Site URL:**
   - `https://hoopjournal.me`

### No other files change

- `main.tsx` (oauth-bridge trampoline) stays the same.
- `OAuthCallback.tsx` stays the same — it already handles tokens from query/hash.
- `nativeOAuth.ts` stays the same.
- The "Hoop Journal wants to use hoopjournal.me to sign in" dialog remains unchanged because the initial URL opened is still `hoopjournal.me/oauth-bridge`.

