

## Analysis: Stripe Webhook Promo Lock-in Flow

I traced the full flow and found **two issues** that could prevent `promo_locked_in` from being set correctly:

### Issue 1: `checkout.session.completed` passes the wrong planId to lock-in check

In `create-checkout`, when a promo user selects Elite, the metadata is set as `plan_id: "elite"` (the original plan), but the actual Stripe price used is Starter. When `checkout.session.completed` fires:
- It sets `subscription_plan: "elite"` in the DB (line 64)
- It calls `checkAndLockPromo(supabase, userId, "elite")`
- `checkAndLockPromo` immediately returns because `planId !== "starter"` (line 142)

So the lock-in does NOT happen on checkout completion.

### Issue 2: `customer.subscription.updated` overwrites with "starter"

When Stripe fires `customer.subscription.updated`, the product ID maps to `"starter"` via `PRODUCT_TO_PLAN`. This:
- Overwrites `subscription_plan` to `"starter"` (correct for billing)
- Calls `checkAndLockPromo(_, _, "starter")` which DOES trigger the lock-in

**However**, `getEffectivePlan` requires `subscriptionPlan === 'starter'` AND `promoLockedIn === true` to grant Elite access. So the subscription.updated path actually works correctly end-to-end, but relies on event ordering (subscription.updated must fire after checkout.session.completed).

### Issue 3: `checkout.session.completed` sets `subscription_plan: planId` (e.g., "elite")

If checkout.session.completed fires *after* subscription.updated, it would overwrite `subscription_plan` from "starter" back to "elite". Then `getEffectivePlan` would see `subscriptionPlan === 'elite'` which doesn't match the promo condition (`=== 'starter'`), so it falls through to return "elite" directly. This actually works by accident, but is fragile.

### Fix Plan

**In `checkout.session.completed`**: When the user is promo-eligible, set `subscription_plan` to `"starter"` (the actual billing plan) instead of the metadata `planId`, and trigger the lock-in immediately.

Specifically:
1. After getting `userId` and `planId` from metadata, query `plan_overrides` for promo eligibility
2. If promo eligible and planId is a paid plan, set `subscription_plan: "starter"` and `promo_locked_in: true` in one upsert
3. If not promo eligible, keep current behavior (`subscription_plan: planId`)

**In `customer.subscription.updated`**: No changes needed -- it already correctly maps Starter product to "starter" and calls `checkAndLockPromo`.

### Technical Detail

```text
BEFORE (broken ordering scenario):
  checkout.session.completed → subscription_plan = "elite", lock-in skipped
  subscription.updated → subscription_plan = "starter", lock-in triggered
  ✓ Works only if events arrive in this order

AFTER (robust):
  checkout.session.completed → detects promo, sets subscription_plan = "starter" + promo_locked_in = true
  subscription.updated → subscription_plan = "starter", lock-in already done (idempotent)
  ✓ Works regardless of event ordering
```

The change is isolated to ~15 lines in `supabase/functions/stripe-webhook/index.ts` within the `checkout.session.completed` case block.

