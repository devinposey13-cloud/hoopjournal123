

## Plan: Daily Revenue Digest Slack Alert

### Summary
Create a new `daily-revenue-digest` edge function that queries the last 24 hours of signup, subscription, and cancellation data, then posts a formatted summary to Slack via the existing `send-slack-alert` function. Schedule it with a daily pg_cron job.

### New Edge Function: `supabase/functions/daily-revenue-digest/index.ts`

Queries the following data for the past 24 hours:
- **New signups**: Count from `account_approval_requests` where `created_at >= 24h ago`
- **Paid conversions**: Count from `plan_overrides` where `subscription_plan != 'free'` and `updated_at >= 24h ago` (new paid users)
- **Cancellations**: Count from `plan_overrides` where `subscription_plan = 'free'` and `updated_at >= 24h ago` (users who reverted to free)
- **Active paid subscribers**: Count from `plan_overrides` grouped by plan tier
- **Estimated daily revenue**: Calculate from active subscriber counts × price per plan (starter/pro: $7.99, elite: $17.99)

Posts the digest via `send-slack-alert` with:
- category: `admin_audit`, severity: `info`
- Title: "📊 Daily Revenue Digest"
- Summary: formatted text with all metrics
- Details: key-value pairs for each metric
- Dedup key: `revenue_digest_{date}`

### Config & Scheduling

- Add `[functions.daily-revenue-digest]` with `verify_jwt = false` to `supabase/config.toml`
- Create a pg_cron job to run daily at 8:00 AM ET (13:00 UTC): `'0 13 * * *'`

### Files
- **Create** `supabase/functions/daily-revenue-digest/index.ts`
- **Edit** `supabase/config.toml` — add function config
- **Insert** pg_cron job via insert tool

