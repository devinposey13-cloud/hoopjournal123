
# Parent Email Notification Feature

## Overview
Send a summary of the post-game AI recap to the parent's email address (collected during onboarding) whenever a player generates their Coach AI recap. This allows parents to stay connected to their child's basketball journey without needing to access the app.

## User Flow
1. Player completes a game and views the Game Detail page
2. Player clicks "Generate My Recap" to get Coach AI feedback
3. After the recap is generated, a "Share with Family" button appears
4. Player clicks the button to send a beautifully formatted email summary to their parent
5. Parent receives an email with the game stats and AI recap

## Why Button-Triggered (Not Automatic)
- Gives player control over what gets shared
- Avoids spam if player regenerates recap multiple times
- Lets player review the recap before sharing
- Respects player privacy and autonomy

---

## Technical Implementation

### 1. New Edge Function: `send-parent-recap`

Create a new edge function at `supabase/functions/send-parent-recap/index.ts` that:
- Accepts game stats, recap text, and player info
- Validates the user is authenticated
- Fetches the parent_email from player_settings
- Generates a branded HTML email with:
  - Player name and team
  - Game result (win/loss) and opponent
  - Key stats highlights (points, rebounds, assists)
  - The full Coach AI recap
  - A motivational closing
- Sends via Resend using the existing RESEND_API_KEY

### 2. Update PostGameRecap Component

Modify `src/components/PostGameRecap.tsx` to:
- Accept new props: `playerName`, `playerTeam`, `parentEmail`
- Add state: `isSendingToParent`, `hasSentToParent`
- After recap is generated and if `parentEmail` exists, show a "Share with Family" button
- On click, call the new edge function
- Show success/error toast feedback
- Disable button after successful send to prevent duplicates

### 3. Update GameDetail Page

Modify `src/pages/GameDetail.tsx` to:
- Pass the player profile info (name, team, parentEmail) to PostGameRecap component

---

## Email Template Design

The email will follow the existing Hoop Journal branding:
- Dark theme matching other transactional emails
- Hoop Journal logo header
- Player name and game info section
- Stats highlights in a styled card
- Full AI recap text
- Encouraging footer message
- Link to the app

```text
Subject: "{PlayerName}'s Game Recap - {Result} vs {Opponent}"

Example: "Marcus's Game Recap - WIN vs Eagles"
```

---

## Files to Create/Modify

### New Files
1. `supabase/functions/send-parent-recap/index.ts` - Edge function for sending parent emails

### Modified Files
1. `src/components/PostGameRecap.tsx` - Add "Share with Family" button and logic
2. `src/pages/GameDetail.tsx` - Pass profile data to PostGameRecap

### Configuration
3. `supabase/config.toml` - Add config for new edge function (verify_jwt = false)

---

## Edge Function Details

```text
Endpoint: POST /functions/v1/send-parent-recap
Authentication: Required (Bearer token)

Request Body:
{
  gameStats: {
    opponent: string,
    points: number,
    rebounds: number,
    assists: number,
    steals: number,
    blocks: number,
    isWin: boolean,
    date: string
  },
  recap: string,
  playerName: string,
  playerTeam: string
}

Response:
{ success: true } or { error: "message" }
```

The function will:
1. Verify the JWT and get user ID
2. Fetch parent_email from player_settings for that user
3. If no parent_email, return error
4. Format and send email via Resend
5. Return success/error

---

## UI Changes in PostGameRecap

After the "Listen to Recap" button, add a new section:

```text
[existing recap content]

[Listen to Recap button]

--- divider ---

Share with Family
[Mail icon] Send to Parent    (or "Sent!" after success)

"Your parent will receive an email with this game summary"
```

The button will be:
- Hidden if no parentEmail is configured
- Shows loading spinner while sending
- Changes to "Sent!" with checkmark after success
- Disabled after successful send (per session)

---

## Security Considerations

- JWT authentication required to prevent unauthorized sends
- Parent email is never exposed to frontend - fetched server-side
- Rate limiting: One send per game recap session (frontend state)
- Only the authenticated user can trigger sends for their own profile

---

## Error Handling

1. **No parent email configured**: Show toast "No parent email set up. Add one in Settings."
2. **Email send fails**: Show toast "Failed to send. Try again later."
3. **Network error**: Show toast with retry option
4. **Success**: Show toast "Game recap sent to your parent!"
