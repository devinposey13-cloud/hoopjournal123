

# Add Hoop Journal Logo to Approval Email

## Overview
Replace the basketball emoji with the actual Hoop Journal logo in the approval email template.

## How Email Images Work
Emails cannot reference local files - images must be hosted at publicly accessible URLs. Since your app is published at `hoopjournal.me`, we can reference the logo from there.

## Changes

### Edge Function Update: `send-approval-email/index.ts`

Replace the emoji-based header with an actual logo image:

| Current | New |
|---------|-----|
| `<span style="font-size: 64px;">🏀</span>` | `<img src="https://hoopjournal.me/assets/hoop-journal-logo.png" alt="Hoop Journal" style="height: 60px; width: auto;">` |

**Alternative approach:** If the logo isn't at that exact path, we can use the favicon or upload the logo to a public location.

### Updated Email Preview

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        [HOOP JOURNAL LOGO]

     Welcome to the Team!
   Your account has been approved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hey Marcus! 👋

Great news! Your Hoop Journal account 
has been reviewed and approved. You now 
have full access to all features:

  📊 Track your game stats
  🎬 Upload highlight clips
  🏆 Earn badges and milestones
  🤖 Chat with Coach AI
  📅 Manage your game schedule

      ┌─────────────────────┐
      │  Open Hoop Journal  │  ← Orange button
      └─────────────────────┘

"The only way to prove you're a good 
sport is to lose." — Ernie Banks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
© 2026 Hoop Journal. Keep grinding! 💪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Technical Details

### Logo Image Tag
```html
<img 
  src="https://hoopjournal.me/assets/hoop-journal-logo.png" 
  alt="Hoop Journal" 
  style="height: 60px; width: auto; margin-bottom: 16px;"
>
```

### Email Client Compatibility
- Uses inline styles (required for email)
- Includes alt text for accessibility
- Fixed height with auto width to maintain aspect ratio
- Falls back to alt text if images are blocked

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-approval-email/index.ts` | Replace emoji with logo image |
| `supabase/functions/send-password-reset/index.ts` | Also add logo for consistency |

