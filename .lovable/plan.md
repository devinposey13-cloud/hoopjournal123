

## Plan: Fix Onboarding Pricing UI & Stripe Checkout Flow

### What changes

**1. Rewrite `PricingPreviewCard` to show all 4 plans + AAU promo**
- Display Free, Starter, Pro, Elite cards in a scrollable 2x2 grid
- Add AAU promo banner above cards
- Add "Have an Event Code?" collapsible section with input that calls `validate-promo-code` edge function
- Starter badge: "Eligible for Elite (with event code)"; Elite badge: "Unlockable via event code"
- Show success toast when promo code is applied

**2. Fix `OnboardingFlow` to redirect paid plans to Stripe Checkout**
- Replace `onSelectStarter` with `onSelectPaid(planId, billingCycle)`
- When a paid plan is selected: call `createCheckout` (from `useSubscription`) which invokes the `create-checkout` edge function → redirects to Stripe
- Free selection still completes onboarding normally
- Never silently fall through to dashboard for paid plans

**3. Update `create-checkout` edge function cancel URL**
- Change cancel URL from `/pricing?canceled=true` to include an onboarding flag: `/pricing?canceled=true&from=onboarding` so the app can route back appropriately
- Alternatively, accept a `returnUrl` param from the client to handle onboarding vs settings contexts

**4. Handle checkout cancel/success return**
- On `/settings/billing?success=true`: existing flow works (subscription check refreshes)
- On cancel: user sees the pricing page with a toast "Checkout canceled — you're still on Free"
- Onboarding does NOT complete until Free is explicitly chosen or Stripe checkout succeeds

### Files to change

| File | Change |
|------|--------|
| `src/components/onboarding/PricingPreviewCard.tsx` | Full rewrite: 4-plan grid, promo banner, event code input, calls `createCheckout` for paid plans |
| `src/components/OnboardingFlow.tsx` | Update props/handlers: `onSelectFree` stays, remove `onSelectStarter`, add paid plan checkout flow that doesn't call `onComplete` |
| `supabase/functions/create-checkout/index.ts` | Accept optional `cancelUrl` param; pass onboarding context in metadata |
| `src/pages/Pricing.tsx` | Show toast on `?canceled=true` query param |

### What stays the same

- `getEffectivePlan` in `lib/plans.ts` — already correctly handles promo lock-in priority
- `stripe-webhook/index.ts` — already handles `checkAndLockPromo` correctly
- `validate-promo-code` edge function — already works server-side
- `useSubscription` hook — `createCheckout` already invokes the edge function and opens the URL

### Technical details

**PricingPreviewCard** key changes:
- State: `selectedPlan: PlanId` (not just `'free' | 'starter'`)
- For paid plans, button calls `supabase.functions.invoke('create-checkout', { body: { planId, billingCycle } })` then `window.location.href = data.url`
- Promo code section uses `supabase.functions.invoke('validate-promo-code', { body: { code } })`
- Loading states on buttons during checkout creation

**OnboardingFlow** key changes:
- `handleSelectFree` → completes onboarding, navigates to `/onboarding/finish`
- `handleSelectPaid` → does NOT call `onComplete`, instead creates checkout session and redirects to Stripe. Onboarding completion happens after successful subscription via the billing success page.

**create-checkout** edge function:
- Accept optional `cancelUrl` in request body, default to current behavior
- From onboarding, pass `cancelUrl: origin + '/pricing?canceled=true&from=onboarding'`

### Scope
- 2 component files edited
- 1 edge function updated + redeployed
- 1 page file minor edit (toast on cancel)

