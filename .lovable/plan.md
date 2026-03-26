

## Fix Post-Auth Shell Flashing

### Problem
The pre-hydration shell in `index.html` (line 41) immediately hides itself when `postAuth` is in the URL. Meanwhile, `main.tsx` (line 20-21) removes the shell entirely when React mounts. This exposes intermediate route transitions (auth_loading → approval_loading → profile_loading → dashboard) before the app resolves the final destination.

### Changes

**1. `index.html` — Keep shell visible during postAuth**
- Line 41: Remove the `if(window.location.search.includes('postAuth'))` auto-hide. Instead, show "Signing you in…" text for both `/auth/callback` AND `postAuth` URLs.
- Add a fade-out CSS transition class and a global listener:
  ```js
  window.__dismissShell = function() {
    var s = document.getElementById('prehydration-shell');
    if (s) { s.style.transition='opacity 0.3s'; s.style.opacity='0'; setTimeout(function(){s.remove()},300); }
  };
  ```

**2. `src/main.tsx` — Conditional shell removal**
- Only remove the shell immediately for non-postAuth routes.
- For `postAuth` routes, leave the shell in place (React renders underneath it at z-index 9999).
  ```typescript
  const isPostAuth = window.location.search.includes('postAuth');
  if (!isPostAuth) {
    shell?.remove();
  }
  ```

**3. `src/pages/Index.tsx` — Signal shell dismissal when route is resolved**
- In the existing `useEffect` that runs post-auth cleanup (lines 304-331), after the route state resolves and URL params are cleaned, call `window.__dismissShell?.()` to fade out and remove the shell.
- This ensures the shell stays visible over all intermediate renders and only disappears once the final screen is ready.
- The post-auth bootstrap gate UI (lines 336-370) becomes a fallback that only matters if the shell was already removed for some reason.

### Result
After Apple auth redirect: user sees the bouncing basketball on dark background → all auth/profile/routing resolves behind it → shell fades out → user lands directly on the correct screen with zero flashing.

