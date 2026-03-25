

## Fix: Hide Pre-hydration Shell on Post-Auth Reload

### Problem
The "HOOP JOURNAL" branded skeleton still flashes during Apple Sign-In on iOS because the auth flow triggers **two** full page reloads:

1. `/auth/callback?access_token=...` — shell is already hidden here (our previous fix)
2. `/?postAuth=1&ts=...` — shell is **NOT** hidden here, so the branded text + spinner shows until React mounts and removes it

Step 2 happens because `handleSessionEstablished` in `OAuthCallback.tsx` calls `window.location.replace('/?postAuth=1&ts=...')` for native iOS to force a webview repaint.

### Fix

**`index.html`** (line 43) — Expand the inline script to also hide the shell when `postAuth` is present in the URL query params:

```javascript
if (
  window.location.pathname === '/auth/callback' ||
  window.location.search.includes('postAuth')
) {
  document.getElementById('prehydration-shell').style.display = 'none';
}
```

This covers both page loads in the iOS Apple auth flow, eliminating the branded flash entirely.

### Files
- `index.html` — expand the existing inline script condition (line 43)

