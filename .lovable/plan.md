

## RevenueCat Integration for iOS In-App Purchases

Since you've already linked Stripe to RevenueCat, RevenueCat will act as the unified entitlement layer for mobile purchases while Stripe continues handling web payments. Both systems will sync subscriptions back to your `plan_overrides` table.

### Architecture

```text
┌─────────────┐     ┌─────────────┐
│  Web (PWA)  │     │  iOS (Cap)  │
│   Stripe    │     │ RevenueCat  │
│  Checkout   │     │  Paywall    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       ▼                   ▼
  stripe-webhook    revenuecat-webhook
  (edge function)   (new edge function)
       │                   │
       └───────┬───────────┘
               ▼
        plan_overrides table
               │
               ▼
        usePlanState hook
      (single source of truth)
```

### Implementation Steps

**1. Platform Detection Utility**
- Create `src/lib/platform.ts` with a helper (`isNativeApp()`) that checks if the app is running inside Capacitor (via `window.Capacitor`). This drives whether to show Stripe checkout or RevenueCat purchase flows.

**2. RevenueCat Client Hook (`useRevenueCat`)**
- Create `src/hooks/useRevenueCat.ts` that:
  - Initializes the RevenueCat Purchases SDK on native platforms only (using `@revenuecat/purchases-capacitor`)
  - Logs in the authenticated user (using their user ID) so RevenueCat links purchases to your backend user
  - Exposes `purchasePackage()`, `restorePurchases()`, and `getOfferings()` methods
  - Maps RevenueCat entitlements to your `PlanId` type

**3. RevenueCat Webhook Edge Function**
- Create `supabase/functions/revenuecat-webhook/index.ts` that:
  - Receives RevenueCat server-to-server webhook events (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION)
  - Validates the webhook auth header against a stored secret
  - Maps RevenueCat product IDs to your `PlanId` values
  - Upserts `plan_overrides.subscription_plan` — same as the Stripe webhook does today
  - This keeps both payment sources writing to the same table

**4. Update Subscription Flow (Conditional Routing)**
- Modify `useSubscription.createCheckout()`: if `isNativeApp()`, call `useRevenueCat.purchasePackage()` instead of invoking the `create-checkout` edge function
- Update `Upgrade.tsx`, `Pricing.tsx`, and `UpgradeDrawer.tsx`: on native, show RevenueCat offerings/prices instead of Stripe prices, and trigger native IAP purchase flow
- On native, hide "Manage Subscription" (Stripe portal) and instead link to iOS subscription settings

**5. Entitlement Sync**
- The `check-subscription` edge function continues to work for web (Stripe)
- For native, RevenueCat webhooks keep `plan_overrides` in sync server-side
- `usePlanState` already reads from `plan_overrides` — no changes needed there

**6. Secrets & Configuration**
- Store `REVENUECAT_WEBHOOK_AUTH_KEY` as a backend secret (for webhook validation)
- Store `REVENUECAT_API_KEY` (iOS public key) in the codebase since it's a publishable key
- Add `@revenuecat/purchases-capacitor` as a dependency

### What Stays the Same
- `plan_overrides` table schema (no changes needed)
- `usePlanState` hook (reads from same table regardless of payment source)
- `getEffectivePlan()` logic (grandfathering, promo, admin overrides all unchanged)
- Web payment flow (Stripe checkout, Stripe webhooks, customer portal)

### RevenueCat Product ID Mapping
You'll need to create products in RevenueCat that map to your existing tiers. The webhook edge function will contain a mapping like:
```typescript
const RC_PRODUCT_TO_PLAN: Record<string, PlanId> = {
  "hj_starter_monthly": "starter",
  "hj_starter_yearly": "starter",
  "hj_pro_monthly": "pro",
  "hj_pro_yearly": "pro",
  "hj_elite_monthly": "elite",
  "hj_elite_yearly": "elite",
};
```

### Pre-requisites Before Implementation
1. You need Capacitor set up in the project (not yet added)
2. RevenueCat product IDs created in your RevenueCat dashboard
3. Your RevenueCat iOS API key and webhook auth key ready

