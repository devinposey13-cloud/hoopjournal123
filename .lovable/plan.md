

## Fix Free Trial Not Appearing at Checkout

### Root Cause

The RevenueCat offering identifier is **`useRevenueCat`** (visible in the RC dashboard screenshot), but the app calls `launchNativePaywall('default')`. RevenueCat cannot find an offering named "default", so the native paywall launch fails silently. The code then falls back to a direct `revenuecat://purchase?product=HoopJ_pro_monthly` call, which bypasses the RevenueCat offering/package system entirely. Direct product purchases do not automatically include introductory offers — those are only presented when purchasing through an offering's package.

### Fix

**1. Update offering identifier in `NativePurchaseSheet.tsx`**

Change `launchNativePaywall('default')` to `launchNativePaywall('useRevenueCat')` to match the actual RC dashboard offering identifier.

**2. Update offering identifier in `useBilling.ts`**

Change the default parameter in `launchNativePaywall` from `offering = 'default'` to `offering = 'useRevenueCat'`.

**3. Fix `launchNativePaywall` promise resolution**

Currently, the `launchNativePaywall` function never resolves when the native paywall is dismissed without a purchase (only on timeout at 180s). This causes the fallback to trigger unpredictably. Add proper dismiss handling so:
- If user purchases → resolve via `onRevenueCatPurchase` callback (already works)
- If user dismisses → the promise should reject with a cancellation error so the fallback does NOT fire

**4. Prevent fallback to direct purchase on user cancellation**

In `NativePurchaseSheet.tsx`, the catch block after `launchNativePaywall` should check for user cancellation and NOT fall through to the direct `purchasePlan()` call, which would bypass introductory offers.

**5. Add logging for offering mismatch debugging**

Log the offering identifier being used so future mismatches are immediately visible in diagnostics.

### Files to modify
- `src/components/purchase/NativePurchaseSheet.tsx` — update offering ID, fix fallback logic
- `src/hooks/useBilling.ts` — update default offering parameter, improve promise lifecycle

### Result
When a user taps subscribe on iOS, the native RevenueCat paywall launches with the correct offering (`useRevenueCat`), which includes the 3-day free trial configured in App Store Connect. The Apple payment sheet will show "Free for 3 days, then $X.XX/month."

