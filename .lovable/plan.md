

## Remove All Free Trial Logic from Subscription Flow

### Summary
Strip all trial-related UI, messaging, code paths, and metadata from the entire subscription and paywall system. Standardize CTAs to "Subscribe" or "Continue". Keep restore purchases and purchase logging intact.

### Files to modify

**1. `src/lib/plans.ts`**
- Remove `TrialConfig` interface, `trialConfigs` object, `getTrialConfig()`, `getTrialCopy()`, `getTrialCta()` functions
- Keep `subscriptionStatus === 'trialing'` checks in `getEffectivePlan()` and `hasSpecialAccess()` — these handle existing trialing users from the backend and must remain
- Update FAQ: replace the "Is there a free trial?" entry with a "Can I cancel?" or similar non-trial question

**2. `src/hooks/useNativeRC.ts`**
- Remove `introPrice` field from `RCPackageInfo` interface
- Remove all intro price parsing logic from `parsePackages()`
- Remove `hasTrialForProduct()` and `getTrialCopyForProduct()` helpers
- Remove trial-related console logs
- Keep `findPackage()` and `packages` for price display

**3. `src/components/pricing/PlanCard.tsx`**
- Remove `nativeTrialCopy` and `nativeTrialCta` props
- Remove all `trialCopy`, `trialCta`, `getTrialConfig`, `getTrialCopy`, `getTrialCta` usage
- CTA button: use `plan.cta` for free, `Subscribe to ${plan.name}` for paid plans
- Remove trial badge/label under price

**4. `src/components/paywall/PaywallSheet.tsx`**
- Remove all `getRCTrialInfo`, `trialConfig`, `trialCopy`, `trialCta`, `selectedRCInfo` trial logic
- Remove imports of `getTrialConfig`, `getTrialCopy`, `getTrialCta`
- Remove trial-specific analytics events (`trial_started`, `trial_offer_viewed`, `trial_purchase_completed`, `ineligible_for_trial_shown`)
- Plan card description: use static taglines instead of trial copy
- CTA: `Subscribe` (not "Start Free Trial")
- Footer: always show "Cancel anytime · No commitment" (remove conditional trial copy)

**5. `src/components/purchase/NativePurchaseSheet.tsx`**
- Remove `getRCInfo` trial fields (`hasTrial`, `trialCopy`, `trialCta`)
- Remove `getTrialCopy`, `getTrialCta` imports
- Remove "Free Trial" badge on plan tiles
- CTA: `Subscribe — {price}/{period}`
- Remove `displayTrialCopy` and `displayTrialCta` variables
- Remove trial-specific logs

**6. `src/pages/Pricing.tsx`**
- Remove `getTrialCopyForProduct`, `hasTrialForProduct` from `useNativeRC` destructuring
- Remove `nativeTrialCopy` and `nativeTrialCta` from `getRCProps` return
- Remove trial-specific logs
- Keep `nativePriceString` for live pricing

**7. `src/pages/Upgrade.tsx`**
- Same as Pricing: remove trial props from `getRCProps`, keep only `nativePriceString`
- Remove `getTrialCopyForProduct`, `hasTrialForProduct` usage

### What stays unchanged
- Restore purchases flow
- Purchase logging (product ID, plan, cycle — just no trial fields)
- Backend `subscriptionStatus === 'trialing'` handling (existing subscribers in trial state still get access)
- All Stripe and RevenueCat purchase mechanics
- `useNativeRC` package fetching and `priceString` display

