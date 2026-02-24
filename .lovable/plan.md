

## Plan: Reimagine the Subscription Section in Settings

### Problem
The current subscription section in Settings is bare-bones. For free users it just says "Free Plan" with an upgrade button. For subscribers, it shows the plan name and renewal date but lacks detail and has no cancel option inline.

### Design

The subscription card will be redesigned into a richer, more informative component:

**For Free users:**
- Plan name ("Free") with a brief tagline from `planCatalog`
- A short list of what's included (2-3 key limits like "2 AI Recaps/mo", "30-day history", "Level 10 cap")
- Prominent "Upgrade" CTA

**For Subscribed users (active or trialing):**
- Plan name + tier badge (Starter/Pro/Elite) with colored styling
- Billing cycle indicator (Monthly/Yearly) derived from the price
- Status badge: "Active", "Trial", or "Canceling"
- Next payment date (from `subscriptionEnd`)
- Monthly/yearly price from `planCatalog`
- "Manage Subscription" button (existing portal flow)
- "Cancel Subscription" button with a confirmation dialog (using the existing `cancelSubscription` method from `useSubscription`)

### Technical Changes

**1. `src/hooks/useSubscription.ts`** — Add `billingCycle` to state
- The `check-subscription` edge function already returns `stripe_subscription_id` but not billing cycle. We need the edge function to also return the price interval.

**2. `supabase/functions/check-subscription/index.ts`** — Return `billing_cycle`
- Extract `subscription.items.data[0].price.recurring.interval` and return it as `billing_cycle` (`"month"` or `"year"`).

**3. `src/components/SettingsPanel.tsx`** — Replace the subscription section (lines 266-320)
- Import `planCatalog` from `@/lib/plans`
- Import `AlertDialog` components for cancel confirmation
- Build a new subscription card with:
  - Plan name, price, and billing info
  - Status badge (Active / Trial / Canceling)
  - Next charge date
  - Key features summary for free users
  - Cancel button with AlertDialog confirmation (immediate vs. end-of-period options)
  - Manage Subscription button for portal access

### Component Structure

```text
┌─────────────────────────────────────────┐
│ [Crown]  Pro Plan           [Active] ▪  │
│          $19/mo · Monthly               │
│                                         │
│  Next payment: Mar 15, 2026             │
│                                         │
│  [Manage Subscription]  [Cancel]        │
└─────────────────────────────────────────┘
```

For free users:
```text
┌─────────────────────────────────────────┐
│ [Crown]  Free Plan                      │
│          Start your journey.            │
│                                         │
│  • 2 AI Recaps/month                    │
│  • 30-day game history                  │
│  • Level 10 XP cap                      │
│                                         │
│  [★ Upgrade to unlock more]             │
└─────────────────────────────────────────┘
```

### Files Modified
1. `supabase/functions/check-subscription/index.ts` — add `billing_cycle` to response
2. `src/hooks/useSubscription.ts` — store `billingCycle` in state
3. `src/components/SettingsPanel.tsx` — redesigned subscription section with cancel flow

