

## Fix: Hide Pre-hydration Shell on Auth Callback

### Problem
The pre-hydration shell in `index.html` displays "HOOP JOURNAL" text + spinner on **every** page load. When the Apple auth edge function redirects to `/auth/callback`, it triggers a full page reload, briefly showing this branded skeleton before React mounts and removes it.

### Fix

**`index.html`** — Add an inline script inside the pre-hydration shell that immediately hides it if the current path is `/auth/callback`. This way, the auth callback route shows only a plain dark background (matching the `bg-background` div in OAuthCallback.tsx), eliminating the branded flash.

```html
<div id="prehydration-shell" style="...">
  <!-- existing content -->
  <script>
    if (window.location.pathname === '/auth/callback') {
      document.getElementById('prehydration-shell').style.display = 'none';
    }
  </script>
</div>
```

### Files
- `index.html` — one small inline script addition

