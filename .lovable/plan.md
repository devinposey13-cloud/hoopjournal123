
Goal: eliminate the intermittent iOS native “stuck white page” after Apple auth by forcing a clean handoff only after the session is safely created, while also ensuring there is never a white pre-hydration screen.

What I think is happening
- This does not look like a normal dashboard loading delay anymore.
- Since you only see a blank white page, not the spinner/skeleton, the problem is likely happening before React paints the callback/dashboard UI in the iPhone native webview.
- The fact that pull-to-refresh fixes it strongly suggests an iOS webview repaint/resume issue after returning from Apple auth.
- So yes: a targeted refresh-style handoff makes sense, but only after auth tokens are stored. I would not do a blind reload on the callback page.

Implementation plan

1. Make the iOS native callback use a hard redirect after session creation
- Update `src/pages/OAuthCallback.tsx`.
- After `setSession()` / `exchangeCodeForSession()` succeeds, detect native iPhone app and use `window.location.replace('/?postAuth=1&ts=...')` instead of React Router `navigate('/')`.
- This gives the webview a full document navigation, which is much closer to the user’s manual pull-to-refresh fix.
- Important: do this only after session creation succeeds, so no tokens are lost and no reload loop happens.

2. Add a small iOS-native recovery fallback on the callback page
- Still in `src/pages/OAuthCallback.tsx`, add a short fallback timer for native iPhone only:
  - if the app is still sitting on `/auth/callback` after a brief delay,
  - and a session already exists,
  - force `window.location.replace('/?postAuth=1')`.
- This covers the intermittent cases where the first transition stalls.

3. Prevent any white screen before React mounts
- Add a minimal inline dark branded loading shell in `index.html` behind `#root`.
- This should match your dashboard colors so even if the webview is slow to repaint, users never see a white blank page.
- Then remove/hide that shell as soon as the app boots in `src/main.tsx` or an early app effect.

4. Keep auth startup non-blocking
- Tighten `src/hooks/useAuth.tsx` so callback-route loading does not sit behind an unnecessary delay.
- Keep `onAuthStateChange` fully synchronous/non-blocking.
- Prefer using the session returned by auth restoration immediately, instead of holding the app in callback-specific loading state longer than needed.

5. Keep the dashboard skeleton as the first visible in-app paint
- In `src/pages/Index.tsx`, preserve the current skeleton-first approach for post-auth.
- If the `postAuth` flag is present, prioritize rendering the branded skeleton immediately while approval/profile checks finish.

Files to update
- `src/pages/OAuthCallback.tsx`
- `src/hooks/useAuth.tsx`
- `index.html`
- `src/main.tsx` or another earliest app-bootstrap file
- possibly a very small follow-up in `src/pages/Index.tsx`

Key decision
- I would not use a generic `window.location.reload()` on `/auth/callback`.
- I would use a controlled `window.location.replace('/')` style handoff after session creation for native iPhone only.
- That gives you the same benefit as pull-to-refresh, without risking token loss or callback loops.

Expected result
- The intermittent white hang should either disappear or be reduced to a branded transition instead of a blank page.
- Even when iOS webview resume is flaky, users should land on a clean reload into the dashboard instead of needing manual refresh.
