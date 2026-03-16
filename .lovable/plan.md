

## Plan: Wire Up Remaining Slack Alert Categories

### Overview
Add 5 new Slack alert triggers to the appropriate edge functions and client components, connecting the already-defined but unwired categories.

### 1. `failed_payment` — Stripe Webhook (Edge Function)

**File:** `supabase/functions/stripe-webhook/index.ts`

Add a new `case "invoice.payment_failed"` handler (currently only `invoice.paid` is handled with a log-only). Fire a `fireSlackAlert` with:
- category: `failed_payment`, severity: `critical`
- Include customer email, invoice ID, amount due
- Dedup key: `failed_payment_{invoice.id}`

### 2. `backend_failure` — Edge Function Error Handlers

**File:** `supabase/functions/coach-chat/index.ts` (highest-traffic edge function)
**File:** `supabase/functions/extract-game-stats/index.ts`
**File:** `supabase/functions/post-game-recap/index.ts`

In the catch blocks of these critical edge functions, add a `fireSlackAlert` call (same pattern as stripe-webhook) with:
- category: `backend_failure`, severity: `critical`
- Include function name, error message
- Dedup key: `backend_failure_{function_name}` (5-min dedup prevents flooding)

### 3. `milestone_alert` — Client Component

**File:** `src/hooks/useGameWithMilestones.ts`

After milestones are awarded (line ~99, when `toReveal.length > 0`), dispatch a client-side Slack alert:
- category: `milestone_alert`, severity: `info`
- Include milestone names, player display name
- Dedup key: `milestone_{game.id}`

Import `dispatchSlackAlert` from `@/utils/slackAlerts`.

### 4. `churn_risk` — New Scheduled Edge Function

Create a lightweight edge function `supabase/functions/check-churn-risk/index.ts` that:
- Queries paid users (`plan_overrides` where `subscription_plan != 'free'`)
- Checks their last game date in `games` table
- If no game logged in 14+ days, fires a `churn_risk` alert with severity `warning`
- Dedup key: `churn_{user_id}` prevents repeat alerts within 5 min (but function runs daily so this is fine)

Add to `supabase/config.toml` with `verify_jwt = false`.

Set up a daily pg_cron job to invoke this function.

### 5. `high_engagement` — Client Component

**File:** `src/hooks/useGameWithMilestones.ts`

After calculating the consistency streak (line ~113), if `streakCount >= 5` (5+ consecutive games), dispatch:
- category: `high_engagement`, severity: `info`
- Include streak count, player info
- Dedup key: `streak_{user.id}_{streakCount}`

### Files to Create/Edit
- **Edit** `supabase/functions/stripe-webhook/index.ts` — add `invoice.payment_failed` case
- **Edit** `supabase/functions/coach-chat/index.ts` — add failure alert in catch block
- **Edit** `supabase/functions/extract-game-stats/index.ts` — add failure alert in catch block
- **Edit** `supabase/functions/post-game-recap/index.ts` — add failure alert in catch block
- **Edit** `src/hooks/useGameWithMilestones.ts` — add milestone + high engagement alerts
- **Create** `supabase/functions/check-churn-risk/index.ts` — daily churn risk checker
- **Edit** `supabase/config.toml` — add `check-churn-risk` function config
- Set up pg_cron job for daily churn check via insert tool

