

## Problem

The onboarding flow (`OnboardingFlow.tsx`) always uses Stripe checkout for paid plan selection — it never checks if the user is on a native (Capacitor) device with RevenueCat available. Every other purchase surface in the app (Pricing, Upgrade, UpgradeDrawer, PaywallModal) correctly branches between RevenueCat (native) and Stripe (web), but onboarding was missed.

## Plan

**File: `src/components/OnboardingFlow.tsx`**

1. Import `useRevenueCat` and `isNativeApp` (same pattern used in Pricing.tsx, Upgrade.tsx, etc.)
2. In `handleSelectPaid`, add the native check before falling through to `createCheckout`:
   - If `isNativeApp() && rcAvailable`, find the matching RevenueCat package by `planId` + `billingCycle` and call `purchasePackage`
   - On success, navigate to `/onboarding/finish` and call `onComplete`
   - Otherwise, fall through to existing Stripe `createCheckout` logic

This mirrors the exact pattern already used in `Upgrade.tsx` and `Pricing.tsx`.

