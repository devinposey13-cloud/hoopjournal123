

## Fix: Eliminate White Screen After Apple Auth on iOS

### Root Cause

The white screen happens in two stages:

1. **OAuthCallback page** (`/auth/callback`): After Apple's edge function redirects back with tokens, this page renders a plain white background with a small spinner while it calls `setSession()` and navigates to `/`. Even though this is fast, it's visually jarring — a blank white page with a generic spinner.

2. **Index page loading gates**: Once at `/`, the `approvalLoading` and `introLoading` hooks need to resolve before the dashboard skeleton appears. There's a brief moment where the background renders but hooks haven't initialized yet.

### Changes

#### 1. `src/pages/OAuthCallback.tsx` — Branded loading state
- Replace the plain white `bg-background` + generic `Loader2` spinner with a branded transition screen that matches the app's dark theme
- Add the app logo/icon and "Signing you in..." text so it feels like part of the app, not a blank redirect page
- This is what the user sees during the ~1-2s token processing window

#### 2. `src/pages/OAuthCallback.tsx` — Skip `tryGetExistingSession` for direct token flows
- When `access_token` and `refresh_token` are both present (the Apple redirect case), skip the 100ms `tryGetExistingSession()` delay and go straight to `setSession()`
- This saves ~100-200ms on every Apple auth

#### 3. `src/pages/OAuthCallback.tsx` — Preload Index route
- Add `router.prefetch` or dynamic import of Index page while tokens are being processed so the next page is ready to render immediately after navigation

#### 4. `src/hooks/useApprovalStatus.ts` + `src/hooks/useFirstLogin.ts` — Faster initial resolution
- Review these hooks for unnecessary delays or sequential awaits that could be parallelized
- If either hook waits for auth state that's already available, skip the wait

### Technical Detail

The most impactful change is making the OAuthCallback page visually identical to the DashboardSkeleton, so the user perceives a single continuous loading experience rather than "white page → skeleton → dashboard." Combined with removing the 100ms `tryGetExistingSession` delay for direct-token flows, this should make the transition feel seamless.

Files changed: 2-4
- `src/pages/OAuthCallback.tsx` (branded UI + skip redundant session check)
- `src/hooks/useApprovalStatus.ts` (review for faster resolution)
- `src/hooks/useFirstLogin.ts` (review for faster resolution)

