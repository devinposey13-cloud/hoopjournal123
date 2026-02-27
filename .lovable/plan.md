

## Testing Stripe Payments Without Waiting for Trial End

There are several ways to test this immediately without any code changes:

### Option 1: Use Stripe Dashboard to End Trial Early
In your Stripe Dashboard, go to **Subscriptions**, find the trialing subscription, and click **Update subscription** → **End trial now**. This immediately converts it to a paid subscription and charges the test card.

### Option 2: Create a Subscription Without Trial
Your current code in `create-checkout` conditionally adds `subscription_data.trial_period_days` based on the plan. You could temporarily create a checkout for the **Elite** plan, which already has no trial period configured.

### Option 3: Use Stripe Test Clocks (Recommended)
Stripe Test Clocks let you simulate time advancing. Create a test clock in Stripe Dashboard → **Developers → Test Clocks**, attach a customer to it, and advance time past the trial period to trigger the payment immediately.

### Option 4: Code Change — Add a `skipTrial` Parameter
Add an optional `skipTrial` flag to `create-checkout` so you can bypass the trial for testing purposes. This is a small, safe change:

**File: `supabase/functions/create-checkout/index.ts`**
- Accept `skipTrial` boolean from the request body
- When `skipTrial` is true, omit `trial_period_days` from `subscription_data`
- No other changes needed — the frontend can pass `skipTrial: true` during testing

This is the most developer-friendly option since you can test from your own app without leaving to the Stripe Dashboard.

### Recommendation
**Option 1** (end trial via Stripe Dashboard) is the fastest — zero code changes, immediate result. **Option 4** is best if you want a reusable testing mechanism built into your app.

