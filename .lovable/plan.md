

# Admin Notification Email for New Signups

## Overview
Create a new edge function that sends you an email notification whenever a new user signs up and creates an account approval request. This will alert you to check the admin approval page promptly.

## How It Works

```text
User Signs Up → Account Created → Approval Request Created → Email Sent to Admin
                                                                    ↓
                                                           You check your inbox
                                                                    ↓
                                                           Go to Admin Panel
                                                                    ↓
                                                           Approve/Reject User
```

## Changes Required

### 1. Create New Edge Function: `notify-admin-signup`

A new function that:
- Receives signup details (username, email)
- Sends a notification email to your personal email address
- Includes a direct link to the admin approval page

**Email Preview:**

```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│             [HOOP JOURNAL LOGO]                     │
│                                                     │
│           New Account Request! 🏀                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  A new user has signed up for Hoop Journal:         │
│                                                     │
│    Username: marcus_ball                            │
│    Email: marcus@example.com                        │
│    Signed up: Jan 30, 2026 at 3:45 PM              │
│                                                     │
│         ┌──────────────────────────┐                │
│         │  Review Account Request  │                │
│         └──────────────────────────┘                │
│                                                     │
├─────────────────────────────────────────────────────┤
│         Hoop Journal Admin Notification             │
└─────────────────────────────────────────────────────┘
```

### 2. Update AuthForm Component

After creating the approval request, call the new edge function to notify you.

### 3. Store Admin Email as Secret

Add your personal email as a secret (`ADMIN_NOTIFICATION_EMAIL`) so it's not hardcoded in the codebase.

## Technical Details

### New Edge Function Structure

| Aspect | Detail |
|--------|--------|
| Function Name | `notify-admin-signup` |
| Auth Required | No (called during signup before user is authenticated) |
| Secrets Used | `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL` |

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/notify-admin-signup/index.ts` | Create new edge function |
| `supabase/config.toml` | Add function config (verify_jwt = false) |
| `src/components/AuthForm.tsx` | Call the new function after signup |

### Security Considerations

- The function doesn't require authentication (since it's called during signup)
- Rate limiting is handled by Resend
- No sensitive user data is exposed (just username/email that user provided)

## What You'll Need

Before implementing, I'll need to add a secret for your admin notification email address.

