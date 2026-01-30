
# Custom Password Reset Email Flow with Resend

## Overview
Replace the default Supabase password reset emails with a custom flow using Resend. This gives you full control over the sender address (`noreply@hoopjournal.me`) and email template design.

## Prerequisites (User Action Required)
Before implementation can work, you'll need to:

1. **Create a Resend account** at https://resend.com (if you don't have one)
2. **Verify your domain** at https://resend.com/domains - add `hoopjournal.me` and configure the DNS records they provide
3. **Create an API key** at https://resend.com/api-keys
4. **Provide the API key** when prompted during implementation

## Architecture

```text
Current Flow:
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│ User clicks  │───▶│ Supabase Auth   │───▶│ Generic email│
│ "Reset"      │    │ resetPassword() │    │ from Supabase│
└──────────────┘    └─────────────────┘    └──────────────┘

New Flow:
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│ User clicks  │───▶│ Edge Function   │───▶│ Resend API   │───▶│ Custom email │
│ "Reset"      │    │ (token + email) │    │              │    │ from your    │
└──────────────┘    └─────────────────┘    └──────────────┘    │ domain       │
                            │                                   └──────────────┘
                            ▼
                    ┌─────────────────┐
                    │ password_reset_ │
                    │ tokens table    │
                    └─────────────────┘
```

## Changes

### Database: New Token Storage Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to auth.users |
| email | text | User's email address |
| token | text | Unique secure reset token |
| expires_at | timestamptz | Token expiration (1 hour) |
| used_at | timestamptz | When token was used (null if unused) |
| created_at | timestamptz | Creation timestamp |

RLS policies will ensure tokens are secure and can only be validated server-side.

### New Edge Function: `send-password-reset`

Handles the reset request:
1. Validates the email exists in auth.users
2. Generates a secure random token
3. Stores token in database with 1-hour expiration
4. Sends branded email via Resend from `noreply@hoopjournal.me`

### New Edge Function: `validate-reset-token`

Validates token when user clicks the link:
1. Checks token exists and hasn't expired
2. Checks token hasn't been used
3. Returns user info if valid

### Frontend Changes

| File | Changes |
|------|---------|
| `ForgotPasswordDialog.tsx` | Call new edge function instead of `supabase.auth.resetPasswordForEmail` |
| `ResetPassword.tsx` | Handle custom token validation, then use `supabase.auth.updateUser` |

### Email Template

The reset email will include:
- Hoop Journal branding
- Personalized greeting
- Clear call-to-action button
- Link expiration notice (1 hour)
- Security notice if they didn't request it

Example email preview:
```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         🏀 HOOP JOURNAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi there,

You requested to reset your password for 
your Hoop Journal account.

      [ Reset Password ]

This link will expire in 1 hour.

If you didn't request this, you can safely 
ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add `password_reset_tokens` table |
| `supabase/functions/send-password-reset/index.ts` | Create | Generate token & send email via Resend |
| `supabase/functions/validate-reset-token/index.ts` | Create | Validate token for password update |
| `src/components/ForgotPasswordDialog.tsx` | Modify | Use new edge function |
| `src/pages/ResetPassword.tsx` | Modify | Validate custom token before allowing password update |
| `supabase/config.toml` | Modify | Add new edge functions config |

## Security Considerations

- Tokens are cryptographically random (32 bytes)
- Tokens expire after 1 hour
- Tokens can only be used once
- Rate limiting: one request per email per 5 minutes
- Tokens validated server-side only (via edge function)
- Email enumeration protection: same response regardless of email existence

## Secret Required

You'll need to add the `RESEND_API_KEY` secret when prompted during implementation.
