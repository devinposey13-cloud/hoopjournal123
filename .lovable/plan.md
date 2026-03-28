

## Fix: iOS Apple Pay Sheet Dismissal Not Detected

### Root Cause

The Despia documentation confirms that `onRevenueCatPurchase()` only fires on **successful** purchases. There is **no** `onRevenueCatPaywallDismiss` callback for direct `revenuecat://purchase` calls (that callback only works with `revenuecat://launchPaywall`).

The current code relies on three detection methods after dispatching a purchase, all of which fail on iOS:

1. `onRevenueCatPaywallDismiss` — never fires for direct purchases
2. `visibilitychange` — the Apple pay sheet is a native modal overlay; the WKWebView is never hidden
3. `focus` — the web view never loses focus because the overlay is native UI

Result: the promise never resolves, `globalPurchaseInFlight` stays `true`, all buttons remain locked.

### Fix

Add a **touch-based return detector**. When the Apple pay sheet is open, the user cannot interact with the web page. The moment the sheet closes, the first `touchstart` or `pointerdown` event on the document signals the user is back.

#### Changes to `src/hooks/useBilling.ts` — `purchaseNative()`

Inside the promise, after dispatching `despia()`:

- Register a `touchstart` listener on `document` that calls `runReturnCheck('touch_return', 500)` when the user touches the page (only if >1s has passed since launch and not yet settled)
- Add this listener to the existing `cleanup()` function so it is properly removed
- Remove the reliance on `onRevenueCatPaywallDismiss` for direct purchases (it never fires)
- Keep the `focus`/`visibilitychange` listeners as secondary fallbacks (they may work on some devices)
- Keep the 120s hard timeout as the last resort

#### No changes needed to `NativePurchaseSheet.tsx` or `PaywallSheet.tsx`

The existing soft-reset logic in the `catch` block of `handlePurchase` already handles the rejected promise correctly — it calls `performSoftReset()` which clears all locks and bumps `resetKey`. Once the promise actually rejects (which the touch detector will now trigger), the UI will recover automatically.

### Summary of the detection chain (in order of priority)

1. `onRevenueCatPurchase` → success path (poll backend, resolve)
2. `touchstart` on document → user regained control → poll backend briefly, then reject as cancelled if no purchase found
3. `focus` / `visibilitychange` → secondary fallback (same logic)
4. 120s hard timeout → last resort

