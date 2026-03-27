

## Streamline Native iOS Purchase Flow and Fix Trial Pass-through

### Problems Identified

1. **Three-step paywall on native**: Pricing page cards → NativePurchaseSheet drawer → RevenueCat native paywall → Apple payment sheet. Users go through 4 screens to purchase.

2. **Same redundancy on PaywallSheet**: The limit-triggered paywall calls `purchasePlan()` which does a direct `revenuecat://purchase?product=X` call. Direct product purchases bypass introductory offers entirely. Only purchases through RC offerings/packages carry trial metadata.

3. **Long delay**: The NativePurchaseSheet blocks on RC bridge initialization before showing content, adding unnecessary wait time.

### Root Cause of Missing Free Trial

The `PaywallSheet.handleUpgrade()` calls `purchasePlan()` → `purchaseNative()` → `despia('revenuecat://purchase?product=HoopJ_pro_monthly')`. This is a **direct product purchase** that bypasses RevenueCat's offering/package system. Introductory offers (free trials) are only presented when purchasing through an offering's package via `launchNativePaywall`.

### Changes

**1. Pricing page: skip NativePurchaseSheet, launch RC paywall directly**

File: `src/pages/Pricing.tsx`

- When native and user taps a plan, call `launchNativePaywall('useRevenueCat')` directly instead of opening the NativePurchaseSheet drawer.
- Remove NativePurchaseSheet component from this page entirely.
- Handle success (show confirmation dialog) and cancellation (do nothing) from the paywall promise.

**2. PaywallSheet: use RC native paywall instead of direct purchase**

File: `src/components/paywall/PaywallSheet.tsx`

- In `handleUpgrade()`, when `isNative` is true, call `launchNativePaywall('useRevenueCat')` instead of `purchasePlan()`.
- This ensures the purchase goes through RC's offering system, which includes introductory offer metadata.
- Handle cancellation gracefully (no error toast, no fallback).

**3. Keep NativePurchaseSheet for other entry points but simplify**

File: `src/components/purchase/NativePurchaseSheet.tsx`

- No changes needed since Pricing and PaywallSheet will bypass it on native.
- It remains available as a fallback component if needed elsewhere.

### Flow After Fix

**Before**: Plan card → NativePurchaseSheet drawer (wait for RC) → RC paywall → Apple sheet
**After**: Plan card → RC paywall → Apple sheet (2 steps instead of 4)

### Files to Modify
- `src/pages/Pricing.tsx` — launch RC paywall directly on native, remove NativePurchaseSheet usage
- `src/components/paywall/PaywallSheet.tsx` — use `launchNativePaywall` on native instead of `purchasePlan`

### Note on Free Trial
If the free trial still doesn't appear after this fix, the issue is in App Store Connect configuration (introductory offer eligibility, subscription group setup, or sandbox account having already used the offer). The code change ensures the app is using the correct path that supports trials.

