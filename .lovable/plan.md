

## Plan: Add Upcoming Games to Parent Dashboard

### What changes

**1. Database function (`get_parent_dashboard_data`)** — Add a new query block that fetches upcoming scheduled games (date >= now, limit 10) from `scheduled_games` for the player's user_id/profile_id. Return as a new `upcoming_games` key in the JSON response.

**2. Frontend (`src/pages/ParentDashboard.tsx`)** — Add an `upcoming_games` array to the `ParentDashboardData` interface and render a new "Upcoming Games" card between the Season Averages and Recent Games sections, showing date, time, opponent, location, and home/away badge.

### Technical details

**SQL migration** — Recreate `get_parent_dashboard_data` to include:
```sql
SELECT COALESCE(jsonb_agg(sg ORDER BY sg.date ASC), '[]'::jsonb) INTO v_upcoming
FROM (
  SELECT id, date, time, opponent, location, is_home, tournament
  FROM scheduled_games
  WHERE user_id = v_token_row.user_id
    AND (v_token_row.profile_id IS NULL OR profile_id = v_token_row.profile_id)
    AND date >= now()
  ORDER BY date ASC
  LIMIT 10
) sg;
```
Add `'upcoming_games', v_upcoming` to the final `jsonb_build_object`.

**Frontend** — New interface field:
```typescript
upcoming_games: Array<{
  id: string; date: string; time: string;
  opponent: string; location: string;
  is_home: boolean; tournament: string | null;
}>;
```
New card with Calendar icon, rendering each game with date, time, opponent, location, and Home/Away badge.

### Scope
- 1 SQL migration (re-create function)
- 1 file edited: `src/pages/ParentDashboard.tsx`

