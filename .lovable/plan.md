

## Improve Paywall/Pricing Navigation and Post-Purchase Flow

### What users experience now
- On Pricing, Upgrade, and Billing pages, the only way back is a "Back" button using `navigate(-1)`, which can fail if there's no history. Users feel stuck.
- After a successful purchase, a toast appears but the user stays on the same page with no clear next step.
- No plan-level badge is visible on the dashboard.

### Changes

**1. Add persistent "X" close button and bottom "Return to Dashboard" on all payment pages**

Files: `src/pages/Pricing.tsx`, `src/pages/Upgrade.tsx`, `src/pages/Billing.tsx`

- Add a fixed "X" (close) button in the top-right corner that always navigates to `/` (dashboard), not `navigate(-1)`.
- Change existing "Back" buttons to use `navigate('/')` as fallback when no history exists.
- Add a prominent "Return to Dashboard" button at the bottom of each page so users always have a visible escape hatch.
- On Upgrade page, make the "Not now" button more prominent (larger, outlined style instead of ghost).

**2. Post-purchase confirmation dialog with auto-redirect**

Files: `src/pages/Pricing.tsx`, `src/pages/Upgrade.tsx`, `src/components/purchase/NativePurchaseSheet.tsx`, `src/components/paywall/PaywallSheet.tsx`

- After successful purchase, show a celebratory confirmation dialog (using AlertDialog) with:
  - Checkmark icon and "Welcome to [Plan Name]!" heading
  - Brief message: "You now have access to all [plan] features."
  - "Go to Dashboard" button that navigates to `/`
  - Auto-redirect to dashboard after 4 seconds if user doesn't tap
- Replace the current toast-only feedback.
- In `PaywallSheet` and `NativePurchaseSheet`, after `onPurchaseComplete` / `onUpgrade`, navigate to `/` with a success state.

**3. Plan badge on dashboard PlayerCard**

Files: `src/components/dashboard/PlayerCard.tsx`

- Add a new optional `planId` prop to `PlayerCard`.
- Display a small badge next to the player name showing:
  - "Free" (muted/outline style)
  - "Pro" (primary colored)
  - "Elite" (gradient orange/amber)
  - "Founding Member" with star icon (if accessBadge indicates it)
- Use the existing `Badge` component with appropriate styling.

File: `src/pages/Index.tsx`

- Pass `currentPlan` and `accessBadge` from `usePlan()` to the `PlayerCard` component.

### Technical details

- The confirmation dialog will be a new reusable component `src/components/purchase/PurchaseConfirmationDialog.tsx` with props: `open`, `planName`, `onGoToDashboard`.
- Auto-redirect uses a `setTimeout` of 4 seconds, cleared on unmount or manual navigation.
- Plan badge styling maps directly from `PlanId` to badge variant/colors using a simple lookup object.

