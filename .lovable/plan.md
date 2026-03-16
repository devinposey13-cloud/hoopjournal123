

## Plan: Auto-Approve Users by Default with Admin Approval Mode Setting

### Summary
Add a configurable "User Approval Mode" setting stored in `feature_flags`, modify the signup flow (both client-side and database trigger) to auto-approve users when the mode is set to "automatic", and update the admin UI to show the mode selector and approval method per user.

### Database Changes (1 migration)

1. **Add `approval_method` column to `account_approval_requests`**
   - `approval_method text DEFAULT 'manual'` — values: `auto`, `manual`, `conditional`
   - Tracks how each user was approved for audit history

2. **Insert a new feature flag row** for `user_approval_mode`
   - `flag_key`: `user_approval_mode`
   - `flag_label`: `User Approval Mode`
   - `description`: `Controls how new signups are approved: automatic, manual, or conditional`
   - Store the mode value in a new `flag_value text DEFAULT 'automatic'` column on `feature_flags`
   - Add this column to the table

### Backend Changes

1. **Update `handle_new_user()` database trigger**
   - After creating the `player_settings` and `account_approval_requests` rows, read the `user_approval_mode` feature flag
   - If mode is `automatic`: set `is_approved = true` on `player_settings` and `status = 'approved'`, `approval_method = 'auto'` on the approval request
   - If mode is `manual`: keep existing behavior (`is_approved = false`, `status = 'pending'`)
   - If mode is `conditional`: auto-approve by default but flag suspicious patterns (e.g., disposable email domains) for manual review
   - All modes still create the approval request record and trigger the webhook notification

2. **Update `handle-signup-webhook` edge function**
   - Include `approval_method` in the Slack notification so admin sees whether user was auto-approved or pending manual review

### Frontend Changes

1. **`src/components/AuthForm.tsx`**
   - Before inserting `player_settings`, check the `user_approval_mode` feature flag
   - If `automatic`: set `is_approved: true` and approval request `status: 'approved'`, `approval_method: 'auto'`
   - If `manual`: keep `is_approved: false` (current behavior)
   - If `conditional`: same as automatic for standard users

2. **`src/hooks/useApprovalStatus.ts`**
   - Add a fast-path: check the feature flag first. If mode is `automatic`, set `isApproved = true` immediately without waiting for DB trigger race conditions
   - Keep all existing self-healing and notification fallback logic

3. **`src/components/AdminPanel.tsx`** — Approvals tab
   - Add a "User Approval Mode" selector card at the top of the Approvals tab with three options: Automatic, Manual, Conditional
   - Read/write from `feature_flags` where `flag_key = 'user_approval_mode'`
   - Show `approval_method` badge (Auto / Manual) on each approval request row
   - Update the Approval Funnel stats to include auto-approved count
   - Dispatch a Slack `admin_audit` alert when the mode is changed

4. **`src/components/PendingApproval.tsx`**
   - No changes needed — this screen simply won't appear when users are auto-approved

### Security
- Feature flag read is already public (existing RLS policy)
- Feature flag write requires admin role (existing RLS policy)
- The trigger runs as `SECURITY DEFINER` so it can read the flag and update tables

### Alert Continuity
- All Slack alerts and email notifications still fire regardless of approval mode
- The notification content will indicate whether the user was auto-approved or needs review
- Admin audit alert fires when approval mode is changed

### Files to Create/Edit
- **New migration**: Add `flag_value` column to `feature_flags`, insert `user_approval_mode` flag, add `approval_method` column to `account_approval_requests`, update `handle_new_user()` trigger function
- **Edit** `src/components/AuthForm.tsx` — check flag, set `is_approved` accordingly
- **Edit** `src/hooks/useApprovalStatus.ts` — fast-path for automatic mode
- **Edit** `src/components/AdminPanel.tsx` — approval mode selector UI + badge on requests
- **Edit** `supabase/functions/handle-signup-webhook/index.ts` — include approval method in notification

