

# Fix Logo for Email Templates

## The Problem
The logo file is currently at `src/assets/hoop-journal-logo.png`. Files in `src/assets/` are bundled by Vite with hashed filenames and cannot be accessed via a predictable public URL. This means the email template will show a broken image.

## The Solution
Move or copy the logo to the `public` folder, which makes it accessible at a direct URL.

## Changes Required

### 1. Add Logo to Public Folder
Copy the logo to `public/hoop-journal-logo.png`

### 2. Update Email Templates
Update the image URL in both edge functions:

| File | Old URL | New URL |
|------|---------|---------|
| `send-approval-email/index.ts` | `https://hoopjournal.me/assets/hoop-journal-logo.png` | `https://hoopjournal.me/hoop-journal-logo.png` |
| `send-password-reset/index.ts` | `https://hoopjournal.me/assets/hoop-journal-logo.png` | `https://hoopjournal.me/hoop-journal-logo.png` |

## Email Preview (After Fix)

```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│             [HOOP JOURNAL LOGO IMAGE]               │
│                                                     │
│              Welcome to the Team!                   │
│         Your account has been approved              │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Hey Marcus! 👋                                     │
│                                                     │
│  Great news! Your Hoop Journal account has been     │
│  reviewed and approved. You now have full access    │
│  to all features:                                   │
│                                                     │
│    📊 Track your game stats                         │
│    🎬 Upload highlight clips                        │
│    🏆 Earn badges and milestones                    │
│    🤖 Chat with Coach AI                            │
│    📅 Manage your game schedule                     │
│                                                     │
│         ┌────────────────────────┐                  │
│         │   Open Hoop Journal    │  ← Orange button │
│         └────────────────────────┘                  │
│                                                     │
│  "The only way to prove you're a good sport is      │
│   to lose." — Ernie Banks                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│      © 2026 Hoop Journal. Keep grinding! 💪         │
└─────────────────────────────────────────────────────┘
```

## Files to Modify

| File | Action |
|------|--------|
| `public/hoop-journal-logo.png` | Create (copy from src/assets) |
| `supabase/functions/send-approval-email/index.ts` | Update logo URL |
| `supabase/functions/send-password-reset/index.ts` | Update logo URL |

## Important Note
After these changes are made and published, the logo will display correctly in both the approval and password reset emails.

