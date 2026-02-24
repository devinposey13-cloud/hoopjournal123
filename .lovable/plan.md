

# Fix: Reliable Admin Signup Notifications

## Problem
Admin email notifications for new signups are sent from the **client-side** only, inside `useApprovalStatus.ts`. This means:
- If the user's browser doesn't fully load the app after OAuth signup, the notification never fires
- If the 5-minute window passes before the hook runs, the notification is skipped
- Service worker interference (the recent mobile OAuth issue) can prevent the hook from executing
- There is zero fallback -- the notification is simply lost

**Evidence:** The most recent signup (`mbcotton23@gmail.com`, today at 2:00 PM UTC) has zero logs in the `notify-admin-signup` function.

## Solution
Move the notification trigger to a **database webhook** so it fires automatically when a new `account_approval_requests` row is inserted, independent of the client.

### 1. Create a new edge function: `handle-signup-webhook`
A database webhook handler that:
- Receives the new `account_approval_requests` row via Supabase webhook payload
- Calls the existing `notify-admin-signup` logic (sends email via Resend)
- Consolidates all notification logic server-side

### 2. Create a database webhook trigger
A SQL migration that:
- Creates a `pg_net` HTTP request on INSERT to `account_approval_requests`
- Calls the new edge function automatically when a row is created by the `handle_new_user` trigger
- This removes dependence on client-side code entirely

### 3. Keep client-side as a fallback
- Keep the existing `useApprovalStatus` notification logic as a secondary fallback
- Add a `notification_sent` column to `account_approval_requests` to prevent duplicate emails
- Both the webhook and client-side check this flag before sending

### 4. Immediate fix for the missed notification
- Manually trigger the notification for `mbcotton23@gmail.com` by calling the edge function

## Technical Details

### New Edge Function: `supabase/functions/handle-signup-webhook/index.ts`
- Validates the webhook payload (checks for `type: "INSERT"` and `record` data)
- Extracts `username` and `email` from the new record
- Sends the admin notification email via Resend (same template as `notify-admin-signup`)
- Updates `account_approval_requests.notification_sent = true`
- Uses service role key for database access

### Database Migration
```sql
-- Add flag to prevent duplicate notifications
ALTER TABLE account_approval_requests 
  ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

-- Create a trigger function that calls the edge function via pg_net
CREATE OR REPLACE FUNCTION notify_admin_on_signup()
RETURNS trigger AS $$
DECLARE
  edge_url text;
  service_key text;
BEGIN
  edge_url := 'https://jwoupnumuotmwpwrkmob.supabase.co/functions/v1/handle-signup-webhook';
  
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'user_id', NEW.user_id,
        'email', NEW.email,
        'username', NEW.username,
        'status', NEW.status
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_approval_request
  AFTER INSERT ON account_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_signup();
```

### Update `useApprovalStatus.ts`
- Check `notification_sent` flag before attempting client-side notification
- Still send as fallback if flag is false (covers edge cases where webhook fails)
- Mark the flag after successful client-side send

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/handle-signup-webhook/index.ts` | **New** -- webhook handler for signup notifications |
| `src/hooks/useApprovalStatus.ts` | Update to check `notification_sent` flag, keep as fallback |
| Database migration | Add `notification_sent` column, create trigger function |
| `supabase/config.toml` | Add `handle-signup-webhook` function config |

## Immediate Action
After implementation, manually trigger the notification for the missed signup (`mbcotton23@gmail.com` / username `mbcotton23`) so you can review and approve the account.

