
## Fix iOS paywall lock after dismissing the Apple purchase sheet

### What I found
The current code already tries to recover from cancellation, but there are still two likely failure points:

1. `useBilling()` is instantiated separately in multiple places (`Upgrade`, `Pricing`, `NativePurchaseSheet`, `PaywallSheet`), so purchase state can drift across components instead of being managed from one shared source.
2. In `purchaseNative`, the fallback return-check timer can be scheduled multiple times from `focus`, `pageshow`, and `visibilitychange` without cancelling the previous one. That can leave stale dismissal logic racing with the next purchase attempt.

This matches the symptom: after cancelling one Apple sheet, the app still believes a purchase session is active, so tapping another plan does nothing until refresh.

### Implementation plan

#### 1. Harden native purchase cleanup in `src/hooks/useBilling.ts`
- Add a single, well-defined reset path for **every** native purchase outcome:
  - success
  - cancel/dismiss
  - error
  - timeout
  - app-return fallback
- Prevent multiple fallback timers from stacking:
  - clear the previous fallback timer before scheduling a new one
  - ignore duplicate `focus` / `pageshow` / `visibilitychange` events once return handling has started
- Add a short-lived “return check in progress” guard so dismissal handling runs once per Apple sheet session.
- Ensure cleanup always removes:
  - `window.onRevenueCatPurchase`
  - `window.onRevenueCatPaywallDismiss`
  - focus/pageshow/visibility listeners
  - any active timeout/fallback timer
  - purchase session refs/locks
- Keep the final `finally` block as the last safety net and make logs explicit:
  - `selected_package`
  - `purchase_sheet_opened`
  - `purchase_sheet_dismissed`
  - `purchase_cancelled`
  - `purchase_error`
  - `purchase_state_reset`
  - `buttons_reenabled`

#### 2. Stop relying on duplicated purchase state across separate hook instances
- Refactor the native paywall surfaces so the component that triggers the purchase is the one that owns the visible loading/lock state.
- Most important target:
  - `src/components/purchase/NativePurchaseSheet.tsx`
- The sheet should use:
  - its own local interaction lock for the active attempt
  - the billing hook only for the actual purchase call/result
- This avoids a stale `isPurchasing` value from another mounted screen instance keeping buttons disabled.

#### 3. Make plan switching immediately available after dismissal in `NativePurchaseSheet`
- Ensure all interactive controls unlock after cancellation:
  - monthly/yearly toggle
  - plan cards
  - subscribe CTA
  - restore button
  - close button
- Keep the selected plan visible after cancellation so the user can either retry it or switch to a different plan immediately.
- Ensure no invisible loading state or backdrop continues intercepting taps after the Apple sheet closes.

#### 4. Audit the other paywall entry point too
- Apply the same cleanup assumptions to `src/components/paywall/PaywallSheet.tsx`, since it also uses `useBilling()` and disables plan selection via `isPurchasing`.
- Make its local `purchasingPlan` and global purchase flags behave safely after cancel so the same lock cannot appear there.

#### 5. Verify the entry screens don’t introduce stale locks
- Review `src/pages/Upgrade.tsx` and `src/pages/Pricing.tsx` to ensure they do not keep redundant loading flags alive after a cancelled native attempt.
- Remove or minimize any state that is only used for web checkout but can interfere with native retry behavior.

### Expected result
After this fix:
- user taps Plan A
- Apple sheet opens
- user cancels
- app immediately resets purchase state
- user can switch to Plan B and tap Subscribe again without refreshing

### Technical notes
- Likely core fix area: `purchaseNative()` timer/listener lifecycle
- Likely UX fix area: avoid using multiple independent `useBilling()` instances as the source of truth for disabled UI
- No backend changes should be needed; this is a client-side native purchase state-management issue
