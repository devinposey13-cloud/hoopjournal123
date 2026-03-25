
Goal: remove the brief “white page” feeling after mobile auth by shortening the post-auth path and showing the dashboard shell immediately while data finishes loading.

1. Tighten the callback handoff
- Update `src/pages/OAuthCallback.tsx` so it stops doing extra verification work after a successful token restore.
- Use the session returned by `setSession` / code exchange as the success signal instead of re-checking multiple times with `getSession()`.
- Navigate to `/` immediately with a lightweight “post-auth transition” flag in router state.

2. Split auth readiness from app-data readiness
- Refine `src/hooks/useAuth.tsx` so the app can distinguish:
  - auth session restored
  - dashboard data still loading
- Keep `onAuthStateChange` simple and non-blocking.
- Add a small “auth ready” signal so downstream hooks only start once session hydration is complete, instead of multiple parts of the app each waiting on their own timing.

3. Reduce dashboard startup latency
- Optimize `src/hooks/useCloudData.ts` by parallelizing independent reads after the active profile is known.
- Keep the current profile lookup as the first dependency, then fetch seasons/games/schedule/clips/profile settings in parallel where possible.
- Avoid redundant post-login reads that don’t affect the first paint.

4. Replace full-screen blank/loading with immediate dashboard skeleton
- In `src/pages/Index.tsx`, render a branded dashboard shell/skeleton immediately after auth instead of a blank callback-looking screen.
- For the first post-auth load on mobile, keep navigation chrome and skeleton cards visible right away so users feel they are already “in” the app.
- Preserve current guards for approval/onboarding, but make the default path feel like a transition into the dashboard rather than a white hold screen.

5. Make loading visuals lighter
- Review `src/components/ui/loading-spinner.tsx` and reduce reliance on the heavier full-screen Lottie spinner during auth-to-dashboard transition.
- Use a simpler lightweight skeleton/spinner for this specific route so the handoff feels faster and avoids a “stuck” impression on mobile.

Expected result
- Best case: the delay is mostly eliminated.
- If network/profile reads still take a moment, users will see the dashboard frame and skeleton instantly instead of a white page, which makes the transition feel smooth.

Technical notes
- Main bottlenecks in the current flow appear to be:
  - extra callback verification in `OAuthCallback.tsx`
  - sequential profile/auth/data gating across `useAuth`, `useActiveProfile`, `useCloudData`, `useApprovalStatus`, and `useFirstLogin`
- I would keep the auth listener non-blocking and avoid awaiting auth calls inside `onAuthStateChange`.
- The practical UX fix is not only “faster auth,” but also “show the dashboard shell before all backend reads complete.”
