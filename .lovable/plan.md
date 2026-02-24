
Goal: make Google OAuth reliable on mobile (especially iOS) so users stay signed in after returning from Google.

What I found from your current code and backend logs:
- Your custom-domain OAuth currently uses a manual redirect to `https://hoopjournal123.lovable.app/~oauth/initiate`.
- It also writes `oauth_state` to `sessionStorage` before redirecting.
- Recent auth logs show no new Google token exchange events for the failing attempts, which indicates some failures happen before session finalization in-app.
- On mobile, even when auth completes externally, the app can still land back on `/` without session hydration (or with hash tokens not being applied reliably).

Implementation plan

1) Replace fragile custom redirect logic with a safer custom-domain OAuth launcher
- Keep using Lovable Cloud OAuth (not raw custom auth implementation changes in generated integration files).
- In `AuthForm.tsx`, remove the manual `sessionStorage.setItem('oauth_state', ...)` dependency.
- Use a deterministic redirect URI that points to a dedicated callback route (example: `/auth/callback`) instead of `/`.
- Ensure OAuth initiation does not depend on storage APIs that can throw on iOS/Safari privacy modes.
- Keep service-worker cache clearing as best-effort only (non-blocking), so redirect initiation isn’t interrupted.

2) Add a dedicated OAuth callback route for robust token handoff
- Create a lightweight callback page/component (e.g., `src/pages/OAuthCallback.tsx`) that:
  - Reads hash/query params on mount.
  - If `access_token` + `refresh_token` are present, calls `supabase.auth.setSession(...)`.
  - Handles error params gracefully with user feedback.
  - Cleans URL hash/query and redirects to `/` once done.
- Register route before the `/:username` dynamic route in `App.tsx` to avoid route collision.
- This isolates OAuth token parsing from heavy app boot logic and prevents “back to login” race conditions.

3) Harden initial auth bootstrap for mobile callback edge cases
- In `useAuth.tsx`, add a first-pass bootstrap check that:
  - Detects token-bearing callback URLs early.
  - Waits for session establishment before declaring auth “not signed in.”
- Preserve existing `onAuthStateChange` + `getSession` ordering, but avoid setting `loading=false` prematurely during callback processing windows.

4) Expand service worker bypass conditions for callback stability
- In `index.html`, extend existing OAuth bypass logic to include the dedicated callback path (`/auth/callback`) in addition to token-bearing hashes.
- Keep current protection so token-bearing URLs are not force-reloaded before session hydration.

5) Add explicit observability for this flow (temporary diagnostics)
- Add concise logs around:
  - OAuth button tap -> initiation URL
  - Callback route load -> token presence
  - `setSession` success/failure
  - final auth state event
- This makes it straightforward to verify whether failures are at initiation, callback parsing, or session persistence.

6) Validation checklist (end-to-end)
- iPhone Safari (non-installed web app): Google sign-in should redirect out and return authenticated.
- iPhone installed app (home-screen): after Google completes, app should come back authenticated, not stuck on login.
- Android Chrome: same pass criteria.
- Regression checks: email/password login and Apple login still work; no `/:username` routing regressions.

Potential edge cases covered
- Safari storage restrictions throwing before redirect.
- OAuth token hash present but not hydrated before auth UI renders.
- Dynamic route (`/:username`) accidentally catching callback path.
- Service worker interference during callback return.

Files planned for update
- `src/components/AuthForm.tsx`
- `src/pages/OAuthCallback.tsx` (new)
- `src/App.tsx`
- `src/hooks/useAuth.tsx`
- `index.html`

Expected outcome
- Mobile OAuth completes consistently, and users are signed in immediately after returning from Google instead of being dropped back at the login form.
