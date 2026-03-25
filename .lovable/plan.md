

## Speed Up iOS Auth Recovery — Drop Skeleton, Shorten Fallback

You're right — the skeleton is just adding visual noise when the real fix is the hard redirect. The white page is the iOS webview stalling before React even paints, so showing a skeleton doesn't help. The fix is to get out of `/auth/callback` faster.

### Changes

**`src/pages/OAuthCallback.tsx`**

1. **Shorten the recovery fallback from 6s to 2s** — If the primary `handleCallback` flow stalls (intermittent iOS webview issue), the watchdog kicks in much sooner. 2 seconds is enough time for `handleCallback` to complete normally, but short enough to catch the hang quickly.

2. **Remove the DashboardSkeleton** from the default render — Replace it with a minimal dark `div` (just `bg-background`) so there's no extra component to mount. The pre-hydration shell in `index.html` already covers the visual gap. The callback page's job is just to process tokens and redirect, not to look like the dashboard.

3. **Keep everything else the same** — The hard `window.location.replace('/?postAuth=1')` approach is correct and matches the pull-to-refresh behavior that works.

### Summary of the change

- Recovery timer: `6000` → `2000`
- Default render: `<DashboardSkeleton />` → empty dark div
- Net effect: worst-case white screen drops from ~6s to ~2s before auto-recovery kicks in

### Files
- `src/pages/OAuthCallback.tsx` (only file changed)

