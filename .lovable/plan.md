

## Update Product ID Mappings for Google Play

### Problem
The Google Play Store product IDs in RevenueCat don't match what the codebase expects:

```text
Current code expects (Android):    RevenueCat Play Store actual:
premium:HoopJ_pro_monthly      →  pro_monthly:promonthly
premium:HoopJ_pro_yearly       →  pro_monthly:proyearly
premium:HoopJ_elite_monthly    →  pro_monthly:elitemonthly
premium:HoopJ_elite_yearly     →  pro_monthly:eliteyearly
```

Also: The Play Store products need their entitlements attached in RevenueCat (screenshot shows "Attach" for all four).

### Plan

**1. Add Play Store product IDs to client mapping (`src/hooks/useBilling.ts`)**
- Add the four new Play Store IDs to `PRODUCT_TO_PLAN`:
  - `pro_monthly:promonthly` → `pro`
  - `pro_monthly:proyearly` → `pro`
  - `pro_monthly:elitemonthly` → `elite`
  - `pro_monthly:eliteyearly` → `elite`
- Update `getNativeProductId()` to return the correct Play Store ID on Android instead of `premium:HoopJ_...`

**2. Add Play Store product IDs to webhook mapping (`supabase/functions/revenuecat-webhook/index.ts`)**
- Add the same four IDs to `RC_PRODUCT_TO_PLAN` so the webhook correctly processes Play Store purchases

**3. RevenueCat setup (manual, not code)**
- Attach entitlements to all four Play Store products in RevenueCat dashboard:
  - `pro_monthly:promonthly` and `pro_monthly:proyearly` → **pro** entitlement
  - `pro_monthly:elitemonthly` and `pro_monthly:eliteyearly` → **elite** entitlement

### Files Changed
- `src/hooks/useBilling.ts` — add Play Store IDs to mapping + fix `getNativeProductId` for Android
- `supabase/functions/revenuecat-webhook/index.ts` — add Play Store IDs to webhook mapping

