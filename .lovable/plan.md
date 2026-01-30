
# Plan: Stripe Subscription Implementation for Hoop Journal

## Overview
Implement a complete subscription payment system with monthly and annual billing options using Stripe's hosted checkout and customer portal. This will enable you to monetize Hoop Journal with recurring subscriptions while users can easily manage their billing.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐     ┌────────────────┐     ┌──────────────────┐      │
│   │  Pricing    │────>│  Stripe        │────>│  Success Page    │      │
│   │  Page       │     │  Checkout      │     │  (subscription   │      │
│   │             │     │  (hosted)      │     │   verified)      │      │
│   └─────────────┘     └────────────────┘     └──────────────────┘      │
│         │                                            │                  │
│         │         ┌────────────────────┐             │                  │
│         └────────>│  Customer Portal   │<────────────┘                  │
│                   │  (manage billing)  │                                │
│                   └────────────────────┘                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## What Will Be Built

### 1. Stripe Products & Prices
Create two subscription products in Stripe:
- **Monthly Plan**: $9.99/month
- **Annual Plan**: $79.99/year (save ~33%)

### 2. Edge Functions (Backend)

**create-checkout** - Creates a Stripe checkout session
- Authenticates user via Supabase token
- Looks up or creates Stripe customer by email
- Accepts `priceId` parameter (monthly or annual)
- Returns checkout URL for redirect

**check-subscription** - Verifies subscription status
- Called on login and page load
- Returns: subscribed status, plan type, renewal date
- Used to gate premium features

**customer-portal** - Opens Stripe's billing portal
- Allows users to update payment method, cancel, or change plans
- Returns portal URL for redirect

### 3. Frontend Components

**Pricing Page** (new route: `/pricing`)
- Displays monthly and annual plan options
- Shows feature comparison (Free vs Pro)
- Checkout buttons that redirect to Stripe

**Subscription Status in Settings**
- Shows current plan details
- "Manage Subscription" button for active subscribers
- "Upgrade" button for free users

**Subscription Context Hook**
- Tracks subscription state globally
- Auto-refreshes on login and periodically
- Provides `isSubscribed`, `planType`, `subscriptionEnd`

### 4. Premium Features Gating
Once subscriptions are active, you can gate features by checking `isSubscribed` from the context.

## Implementation Details

### Edge Function: create-checkout
```text
Input:  { priceId: string } + Auth token
Output: { url: string } (Stripe checkout URL)

Flow:
1. Verify user authentication
2. Find/create Stripe customer by email
3. Create checkout session with mode: "subscription"
4. Return checkout URL
```

### Edge Function: check-subscription
```text
Input:  Auth token only
Output: { subscribed: boolean, planType: string, subscriptionEnd: string }

Flow:
1. Verify user authentication
2. Find Stripe customer by email
3. List active subscriptions
4. Return subscription status
```

### Edge Function: customer-portal
```text
Input:  Auth token only
Output: { url: string } (Stripe portal URL)

Flow:
1. Verify user authentication
2. Find Stripe customer by email
3. Create portal session
4. Return portal URL
```

### Pricing Page Layout
```text
┌─────────────────────────────────────────────────────────────────┐
│                      Choose Your Plan                           │
├────────────────────────┬────────────────────────────────────────┤
│      FREE              │              PRO                       │
│                        │                                        │
│  - Basic game logging  │  - Everything in Free                  │
│  - 10 games/season     │  - Unlimited games                     │
│  - Season stats        │  - AI Coach Chat                       │
│                        │  - Video clip storage                  │
│                        │  - Advanced analytics                  │
│                        │  - Priority support                    │
│                        │                                        │
│   [Current Plan]       │  Monthly: $9.99  [Subscribe]           │
│                        │  Annual:  $79.99 [Subscribe]           │
│                        │  (Save 33%!)                           │
└────────────────────────┴────────────────────────────────────────┘
```

### Navigation Update
Add "Pricing" tab or link accessible from Settings/Dashboard for users to view/upgrade their plan.

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/create-checkout/index.ts` | Checkout session creation |
| `supabase/functions/check-subscription/index.ts` | Subscription verification |
| `supabase/functions/customer-portal/index.ts` | Billing portal session |
| `src/pages/Pricing.tsx` | Pricing page with plan options |
| `src/hooks/useSubscription.ts` | Subscription state management |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add new edge function configurations |
| `src/App.tsx` | Add `/pricing` route, wrap with subscription provider |
| `src/components/SettingsPanel.tsx` | Add subscription status and management buttons |
| `src/pages/Index.tsx` | Integrate subscription check on load |

## User Experience Flow

1. **New User Signs Up** - Gets free tier by default
2. **Views Pricing Page** - Sees plan comparison with upgrade options
3. **Clicks Subscribe** - Redirected to Stripe Checkout (hosted, secure)
4. **Completes Payment** - Redirected to success page
5. **Subscription Active** - Premium features unlocked immediately
6. **Manages Billing** - Uses Stripe Customer Portal from Settings

## Technical Notes

- Stripe secret key is already configured (STRIPE_SECRET_KEY)
- Uses Stripe's hosted pages (no PCI compliance burden)
- Customer Portal allows users to self-manage subscriptions
- No webhooks needed initially - subscription status checked on-demand
- Products/prices created via Lovable's Stripe tools

## Security Considerations

- All subscription checks happen server-side
- User authentication required for all edge functions
- Stripe handles all payment data (PCI compliant)
- No sensitive data stored in frontend
