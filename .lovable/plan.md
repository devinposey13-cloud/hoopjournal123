

## Remove Trial Period from Stripe Checkout

### Summary
Remove all trial-related logic from the `create-checkout` edge function so web Stripe purchases are standard paid subscriptions with no free trial.

### Changes

**`supabase/functions/create-checkout/index.ts`**
- Remove the `TRIAL_PLANS` constant and `trialDays` variable
- Remove the `subscription_data.trial_period_days` block
- Remove `has_trial` from session metadata
- Remove trial-related log statements

