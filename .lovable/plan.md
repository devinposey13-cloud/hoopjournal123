

# Add Delete Profile & Start Over to Settings Panel

## Overview
Add two account management features to the Settings Panel:
1. **Delete Profile** - Permanently deletes the user's account and all data from both the application and authentication system
2. **Start Over** - Wipes all game data and uploads while keeping the account, then restarts the onboarding flow

Both actions will require a confirmation dialog to prevent accidental data loss.

## Current State
- `src/components/SettingsPanel.tsx` contains profile settings with save, avatar upload, subscription management, and feedback sections
- `supabase/functions/admin-delete-user/index.ts` exists but only allows admins to delete other users (not self-delete)
- `useFirstLogin.ts` hook manages onboarding state based on `onboarding_completed_at` timestamp in database
- `useCloudData.ts` handles all data operations (games, clips, schedule, seasons, profile)

## Changes

### 1. Create New Edge Function: `delete-own-account`
Create a new edge function that allows users to delete their own account (not requiring admin privileges like the existing admin function).

```text
Location: supabase/functions/delete-own-account/index.ts

Features:
- Verify JWT token to identify the requesting user
- Delete all user data from application tables (same order as admin-delete-user)
- Delete files from storage buckets (avatars, video-clips)
- Finally delete the user from auth.users using service role
- Return success response
```

Tables to clean (in order):
- video_likes
- video_comments
- video_clips (+ delete from storage)
- stats_predictions
- postgame_insights
- player_milestones
- player_badges
- user_achievements
- user_game_stats
- game_scores
- games
- scheduled_games
- seasons
- user_feedback
- password_reset_requests
- content_reports
- account_approval_requests
- player_settings (+ delete avatar from storage)
- user_roles

### 2. Update `src/components/SettingsPanel.tsx`
Add a "Danger Zone" section at the bottom of the settings panel:

```text
New imports needed:
- AlertDialog components from @/components/ui/alert-dialog
- AlertTriangle icon from lucide-react

New state:
- showDeleteDialog: boolean
- showStartOverDialog: boolean
- isStartingOver: boolean
- isDeletingAccount: boolean
- deleteConfirmText: string (user must type "DELETE" to confirm)
- startOverConfirmText: string (user must type "RESTART" to confirm)

New UI section after Feedback:
<Separator />
<div className="space-y-4">
  <h3>Danger Zone</h3>
  
  <!-- Start Over Card -->
  <div className="border border-amber-500/30 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div>
        <h4>Start Over</h4>
        <p>Wipe all game data, clips, and schedule. You'll go through onboarding again.</p>
      </div>
      <Button variant="outline" onClick={() => setShowStartOverDialog(true)}>
        Start Fresh
      </Button>
    </div>
  </div>
  
  <!-- Delete Account Card -->
  <div className="border border-destructive/30 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div>
        <h4>Delete Account</h4>
        <p>Permanently delete your account and all data. This cannot be undone.</p>
      </div>
      <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
        Delete Account
      </Button>
    </div>
  </div>
</div>

<!-- Confirmation Dialogs -->
<AlertDialog for Delete Account>
  - Title: "Delete Your Account?"
  - Warning icon
  - Explain data will be permanently deleted
  - Require user to type "DELETE" to enable confirm button
  - Spinner during deletion
  - On confirm: call edge function, sign out, redirect to auth

<AlertDialog for Start Over>
  - Title: "Start Over From Scratch?"
  - Refresh icon
  - Explain game data will be wiped and onboarding will restart
  - Require user to type "RESTART" to enable confirm button
  - Spinner during reset
  - On confirm: call handleStartOver function
```

### 3. Create `handleStartOver` Function in SettingsPanel
This function wipes all user data except the account itself:

```text
Steps:
1. Delete all video clips from storage bucket
2. Delete from tables: video_likes, video_comments, video_clips, 
   stats_predictions, postgame_insights, player_milestones, player_badges,
   user_achievements, user_game_stats, game_scores, games, scheduled_games, seasons
3. Reset player_settings to defaults (clear onboarding_completed_at to trigger re-onboarding)
4. Clear localStorage intro flag
5. Show success toast
6. Navigate to home (which will show onboarding flow)
```

### 4. Add Callback Props to SettingsPanel
The Settings Panel needs to communicate the start-over action to the parent:

```text
Add new prop:
- onStartOver?: () => void

When start over completes:
- Call onStartOver() to allow parent (Index.tsx) to handle navigation/state reset
```

### 5. Update `src/pages/Index.tsx`
Pass the start over handler to SettingsPanel:

```text
Add handler:
const handleStartOver = () => {
  // Clear the localStorage intro flag
  localStorage.removeItem('hoopjournal_intro_seen');
  // Force page reload to trigger fresh onboarding detection
  window.location.reload();
};

Pass to SettingsPanel:
<SettingsPanel 
  ...existing props
  onStartOver={handleStartOver}
/>
```

## User Flow

### Delete Account Flow:
1. User clicks "Delete Account" button in Danger Zone
2. Confirmation dialog appears with warning
3. User must type "DELETE" to enable confirm button
4. User clicks confirm -> spinner shows
5. Edge function deletes all data + auth user
6. User is signed out and redirected to login page
7. Success toast shown

### Start Over Flow:
1. User clicks "Start Fresh" button in Danger Zone
2. Confirmation dialog appears with explanation
3. User must type "RESTART" to enable confirm button
4. User clicks confirm -> spinner shows
5. All game data, clips, schedule, seasons deleted
6. Profile reset with onboarding_completed_at = null
7. localStorage intro flag cleared
8. Page reloads, triggering intro animation + onboarding flow
9. User goes through onboarding as if new

## Security Considerations
- Edge function verifies JWT to ensure users can only delete their own account
- Type-to-confirm pattern prevents accidental clicks
- Two-step confirmation (button + dialog) adds friction
- Service role key only used server-side in edge function

## Technical Notes
- The existing `admin-delete-user` function cannot be reused because it requires admin role verification
- Start Over uses direct database calls since it doesn't need service role (RLS allows users to delete their own data)
- Storage bucket cleanup is important to avoid orphaned files

