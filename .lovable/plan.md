

## Hide Pending Approval Screen While Auto-Approval Is Active

The `useApprovalStatus` hook already has a fast-path that checks the `user_approval_mode` feature flag. When it's `"automatic"`, it sets `isApproved = true` immediately. However, there's a brief window where `approvalLoading` is `true` and then `isApproved` resolves — during which the pending screen can flash.

### Change

**`src/hooks/useApprovalStatus.ts`** — One targeted fix:

- Move the `"automatic"` mode check to happen **synchronously before any async work**. Cache the last-known approval mode in `localStorage` so returning users skip the loading state entirely.
- On first load, immediately set `isApproved = true` and `loading = false` if the cached mode is `"automatic"`, then verify in the background.
- This eliminates the brief flash of the pending approval screen for all logins while auto-approval is active.
- The `PendingApproval` component, the `useApprovalStatus` hook logic for manual/conditional modes, and the gate in `Index.tsx` all remain intact and ready to re-enable.

### Why not just remove the gate in Index.tsx?

That would work but would require re-adding it later. Instead, making the hook resolve instantly for automatic mode keeps the gate in place — it just never triggers because `isApproved` is `true` before the first render.

### Files
- `src/hooks/useApprovalStatus.ts` (only file changed)

