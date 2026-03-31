

## Reset Tester Account Password

### Approach
Use the existing `admin-password-reset` edge function to set a new password for `appreview@hoopjournal.me` directly — no email required.

### Steps
1. Call the `admin-password-reset` edge function with the tester's user ID and a new password
2. Share the updated credentials with you

### What You'll Get
- **Email:** `appreview@hoopjournal.me`
- **Password:** A new password you choose (or I can generate one)

### Alternative
If you'd prefer a real email address for the tester account (so Google reviewers can actually receive verification emails if needed), I can:
1. Create a **new** tester account with a real email you control
2. Set a known password via the admin function

No code changes needed — this is purely an operational task using existing infrastructure.

