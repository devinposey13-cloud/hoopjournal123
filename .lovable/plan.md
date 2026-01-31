

# Multi-Team Support Implementation Plan

## Overview
This plan adds the ability for players to belong to multiple teams (e.g., school team, travel team, AAU team) and select which team they played for when logging a game.

---

## What You'll See

### In Settings
- A new "My Teams" section where you can add and remove teams
- Your existing team name will be automatically migrated as your first team
- Add new teams with a simple text input
- Remove teams you no longer play for

### When Adding a Game
- A new dropdown labeled "Team" will appear at the top of the game form
- Your default/primary team will be pre-selected
- Select a different team if logging a game for another squad

### On Game Cards
- Games will show which team you played for (if you have multiple teams)

---

## Technical Details

### Database Changes

**New Table: `player_teams`**
```text
+------------------+----------+--------------------------------+
| Column           | Type     | Description                    |
+------------------+----------+--------------------------------+
| id               | uuid     | Primary key                    |
| user_id          | uuid     | References the user            |
| name             | text     | Team name (e.g., "Lakers AAU") |
| is_primary       | boolean  | Default team for new games     |
| created_at       | timestamp| When team was added            |
+------------------+----------+--------------------------------+
```

**Games Table Update**
- Add `team_id` column (uuid, nullable) referencing `player_teams.id`
- Existing games will have `team_id` set to null initially

**Data Migration**
- If user has existing `team` value in `player_settings`, create a `player_teams` entry and mark as primary
- Existing games will be linked to this primary team

### Files to Create/Modify

**New Files:**
- `src/hooks/usePlayerTeams.ts` - Hook to manage player teams

**Modified Files:**
- `src/types/basketball.ts` - Add `PlayerTeam` type and update `GameStats`
- `src/components/SettingsPanel.tsx` - Add teams management section
- `src/components/GameStatsForm.tsx` - Add team dropdown
- `src/hooks/useCloudData.ts` - Fetch teams, include team_id when adding games
- `src/components/GameCard.tsx` - Display team name if multiple teams exist
- `src/integrations/supabase/types.ts` - Auto-updated with new schema

### RLS Policies
- Users can only CRUD their own teams
- Same isolation pattern as other user data

---

## Implementation Steps

1. Create database migration for `player_teams` table and games column
2. Add data migration to convert existing team data
3. Create the `usePlayerTeams` hook for CRUD operations
4. Update TypeScript types
5. Add teams management UI to Settings
6. Add team dropdown to GameStatsForm
7. Update game display to show team when relevant

