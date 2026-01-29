
# Add Instagram URL to User Profile

## Overview
Add an Instagram URL field to user profile settings that allows players to link their Instagram account. Display an Instagram button on the dashboard's PlayerHeader component that links to the user's Instagram profile when configured.

## Changes Required

### 1. Database Schema Update
Add a new nullable column `instagram_url` to the `player_settings` table to store the user's Instagram profile URL.

```sql
ALTER TABLE player_settings 
ADD COLUMN instagram_url text;
```

### 2. TypeScript Types Update
**File: `src/types/basketball.ts`**

Add `instagramUrl` to the `PlayerProfile` interface:
```typescript
export interface PlayerProfile {
  // ... existing fields
  instagramUrl?: string;
}
```

### 3. Settings Panel Update
**File: `src/components/SettingsPanel.tsx`**

Add a new input field for the Instagram URL in the settings form:
- Place it after the Theme Music URL field
- Include an Instagram icon
- Add placeholder text for expected format (e.g., `https://instagram.com/username`)
- Add helper text explaining the field

### 4. Data Hook Update
**File: `src/hooks/useCloudData.ts`**

Update two locations:
1. **Fetch profile** (around line 188-201): Map `instagram_url` from database to `instagramUrl` in the profile state
2. **Update profile** (around line 648-680): Include `instagram_url` in the upsert operation

### 5. Player Header Update
**File: `src/components/PlayerHeader.tsx`**

Add an Instagram icon button next to the player info that:
- Only displays when `profile.instagramUrl` has a value
- Opens the Instagram URL in a new tab when clicked
- Uses a subtle, branded Instagram style

### 6. Public Profile Update (Optional Enhancement)
**File: `src/pages/PublicProfile.tsx`**

If the user has a public profile and Instagram URL configured, display the Instagram button on their public profile page as well.

---

## Technical Details

### Database Migration
```sql
-- Add instagram_url column to player_settings
ALTER TABLE player_settings 
ADD COLUMN instagram_url text;
```

### Type Definition Change
```typescript
// src/types/basketball.ts
export interface PlayerProfile {
  name: string;
  team: string;
  position: string;
  number: number;
  height: string;
  grade: string;
  avatar?: string;
  username?: string;
  displayName?: string;
  isProfilePublic?: boolean;
  themeMusicUrl?: string;
  instagramUrl?: string;  // NEW
}
```

### Settings Panel Addition
The Instagram URL input will include:
- Instagram icon from lucide-react
- Input validation for URL format
- Helper text: "Link your Instagram profile to display on your dashboard"

### PlayerHeader Instagram Button
```text
+-------------------------------------------+
| [Avatar] Player Name                      |
|          #23 • Guard • Team • 8th Grade   |
|          [Instagram Icon Button]          |  <- NEW
+-------------------------------------------+
```

The button will:
- Be conditionally rendered only when `instagramUrl` exists
- Open the link in a new tab with `rel="noopener noreferrer"`
- Use a recognizable Instagram icon

### Data Flow
```text
Settings Panel (Input)
    ↓
useCloudData.updateProfile()
    ↓
Supabase player_settings.instagram_url
    ↓
useCloudData.fetchData()
    ↓
PlayerHeader (Display Button)
```

## Files to Modify
1. `src/types/basketball.ts` - Add `instagramUrl` to PlayerProfile
2. `src/components/SettingsPanel.tsx` - Add Instagram URL input field
3. `src/hooks/useCloudData.ts` - Handle instagramUrl in fetch and update
4. `src/components/PlayerHeader.tsx` - Add Instagram button
5. `src/pages/PublicProfile.tsx` - Show Instagram on public profile
6. Database migration - Add `instagram_url` column
