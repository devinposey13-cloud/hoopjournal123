

## Fix Native Paywall to Display Apple Free Trials from RevenueCat

### Problem
The app shows hardcoded "3-day free trial" text on its own paywall UI, but when the RevenueCat native paywall launches, the actual Apple payment sheet does not display the trial. The app's trial messaging comes from `plans.ts` static config rather than from RevenueCat's live product metadata.

### Root Cause
1. The `useNativeRC` hook fetches offerings data (`revenuecat://getOfferings`) but only logs it — it never exposes the data to components.
2. The paywall UI (PaywallSheet, NativePurchaseSheet, PlanCard, Pricing) uses hardcoded `getTrialConfig()` / `getTrialCopy()` from `plans.ts` instead of real RC product metadata.
3. If `getOfferings` returns products with no `introductoryPrice`, the app still claims a trial exists — misleading users and Apple reviewers.

### Solution
Expose RC offerings data from `useNativeRC`, then use real intro price metadata in all paywall surfaces on native. On web, continue using hardcoded config (Stripe handles trials separately).

### Changes

**1. `src/hooks/useNativeRC.ts`** — Expose offerings packages and intro price data
- Add `offerings` and `packages` to the hook's return type (array of `{ identifier, productId, priceString, introPrice? }`)
- Store parsed offerings data from the existing `revenuecat://getOfferings` call in state instead of just logging it
- Export a helper to check if a specific product has a trial

**2. `src/components/purchase/NativePurchaseSheet.tsx`** — Use live RC metadata for pricing/trial
- Import offerings data from `useNativeRC`
- When rendering plan tiles, match each plan to its RC package and display `product.priceString` and intro price from RC data
- Replace hardcoded `getTrialCopy`/`getTrialCta` with RC intro price metadata on native
- Show "3-day free trial, then $X.XX/month" only when RC confirms `introPrice` exists
- If no intro price from RC, do not show trial messaging (prevents misleading users)

**3. `src/components/paywall/PaywallSheet.tsx`** — Use live RC metadata on native
- Same approach: import `useNativeRC` offerings data
- Replace hardcoded trial copy/CTA with RC-sourced intro price info for native
- Keep hardcoded values as fallback for web (Stripe path)

**4. `src/pages/Pricing.tsx`** — Use live RC metadata on native
- Import `useNativeRC` and pass RC package price strings to `PlanCard` via the existing `nativePriceString` prop
- Show trial messaging from RC metadata, not hardcoded config

**5. `src/components/pricing/PlanCard.tsx`** — Add native trial display prop
- Add optional `nativeTrialCopy` prop; when provided, use it instead of `getTrialCopy()`
- Add optional `nativeTrialCta` prop; when provided, use it for the button text

**6. `src/pages/Upgrade.tsx`** — Same pattern for the upgrade page

### Data flow
```text
useNativeRC (mount)
  → despia('revenuecat://getOfferings')
  → parse packages: [{ id, productId, priceString, introPrice }]
  → expose via hook return

PaywallSheet / NativePurchaseSheet / Pricing
  → const { packages } = useNativeRC()
  → match plan to package by productId
  → display package.priceString + package.introPrice info
  → CTA: "Start Free Trial" only if introPrice confirmed
```

### Logging added
- Log each package's `introductoryPrice` presence, period, and price on offerings fetch
- Log whether trial messaging is sourced from RC metadata or hardcoded fallback
- Log the exact package identifier and intro price when user taps subscribe

### What this fixes
- Trial messaging will only appear when Apple's products actually have an introductory offer configured and detected by RevenueCat
- Apple reviewers will see accurate trial information matching what the payment sheet shows
- If RC can't fetch offerings (rare), falls back to hardcoded config with a warning log

### Files to modify
- `src/hooks/useNativeRC.ts`
- `src/components/purchase/NativePurchaseSheet.tsx`
- `src/components/paywall/PaywallSheet.tsx`
- `src/pages/Pricing.tsx`
- `src/pages/Upgrade.tsx`
- `src/components/pricing/PlanCard.tsx`

