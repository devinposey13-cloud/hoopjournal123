

## Fix: Spotify Player Settings Update Failing

The test revealed a bug: saving the Spotify URL in Settings fails with error "Could not find the 'username' column of 'player_settings' in the schema cache".

### Root Cause

The `updateProfile` function in `useCloudData.ts` attempts to save a `username` field to the database, but this column does not exist in the `player_settings` table. The Settings panel has a UI for claiming usernames, but the database migration for the `username` column was never created.

### Fix Options

**Option A: Add the missing `username` column (Recommended)**
- Create a database migration to add `username` column to `player_settings`
- Add a unique constraint on username for public profile URLs
- This enables the full public profile URL feature

**Option B: Remove username from the upsert (Quick fix)**
- Remove the `username` field from the `updateProfile` upsert in `useCloudData.ts`
- Hide or disable the username claiming UI in Settings until properly implemented
- Spotify player will work but public profiles won't

---

### Implementation: Option A

**Step 1: Database Migration**
```sql
-- Add username column to player_settings
ALTER TABLE public.player_settings 
ADD COLUMN username text UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_player_settings_username ON public.player_settings(username);
```

**Step 2: Verify and Test**
- After migration, re-test saving the Spotify URL
- Verify the Settings page saves successfully
- Navigate to pregame page and confirm Spotify player appears

---

### Technical Details

**Files Affected:**
- Database: `player_settings` table needs `username` column
- No code changes needed - the existing code already handles the field correctly

**Current Database Schema (player_settings):**
- Has: avatar_url, display_name, grade, height, is_profile_public, name, number, phone, position, team, theme_music_url, user_id
- Missing: `username`

**Current Code (useCloudData.ts line 590):**
```typescript
username: updates.username ?? profile.username ?? null,  // This fails!
```

