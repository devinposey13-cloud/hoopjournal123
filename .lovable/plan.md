

# Add Tournament Field with Quick Duplicate Feature

## Overview

Add a "Tournament" field to scheduled games that allows users to group games under a tournament name, and provide a convenient way to quickly create multiple tournament games without re-entering common information.

---

## Part 1: Database Schema Update

Add a new `tournament` column to the `scheduled_games` table.

```sql
ALTER TABLE scheduled_games
ADD COLUMN tournament text DEFAULT NULL;
```

---

## Part 2: Update TypeScript Types

**File: `src/types/basketball.ts`**

Add `tournament` to the `ScheduledGame` interface:

```typescript
export interface ScheduledGame {
  id: string;
  date: string;
  time: string;
  opponent: string;
  location: string;
  isHome: boolean;
  notes?: string;
  tournament?: string;  // NEW
}
```

---

## Part 3: Update Data Layer

**File: `src/hooks/useCloudData.ts`**

- Update `fetchData` to include `tournament` field when mapping scheduled games
- Update `addScheduledGame` to include tournament in insert
- Update `updateScheduledGame` to handle tournament updates
- Update `bulkImportScheduledGames` to include tournament field

---

## Part 4: Update Edit Dialog with Tournament Field + "Duplicate for Tournament" Feature

**File: `src/components/EditScheduleDialog.tsx`**

Add:
1. **Tournament input field** - optional text field for tournament name
2. **"Add Another Game" button** - appears when tournament is filled in, allowing quick duplication

When "Add Another Game" is clicked:
- Save current game changes
- Open a new dialog pre-filled with: tournament name, location, isHome setting
- Only require: new date, time, and opponent
- This creates a streamlined flow for tournament entry

---

## Part 5: Update Add Schedule Dialog

**File: `src/components/AddScheduleDialog.tsx`**

Add:
1. **Tournament input field**
2. **"Add Multiple Games" toggle** - when enabled, shows:
   - A list of games to add (date + time + opponent rows)
   - "Add Row" button to add more games
   - All games share the same: tournament, location, isHome
   - Submit creates all games at once via `bulkImportScheduledGames`

This enables rapid tournament entry:
1. Enter tournament name + location + home/away once
2. Add rows for each game: just pick date, time, opponent
3. Submit all at once

---

## Part 6: Update Quick Add Dialog

**File: `src/components/QuickAddScheduleDialog.tsx`**

Add the tournament field, keeping it optional for single game quick-adds.

---

## Part 7: Display Tournament in Game Detail Page

**File: `src/pages/GameDetail.tsx`**

Show tournament name in the Game Details card if present:
```
Tournament: Winter Classic 2026
```

---

## Part 8: Display Tournament Badge in Calendar

**File: `src/components/ScheduleCalendar.tsx`**

When showing game details in the expanded date view, display a tournament badge if the game is part of a tournament.

---

## User Flow Summary

**Single Game Entry:**
- Use existing flow, optionally add tournament name

**Tournament Entry (Efficient):**
1. Click "Add Game" or use calendar quick-add
2. Enter tournament name (e.g., "Winter Classic")
3. Enter location once
4. Toggle "Add Multiple Games"
5. Add rows for each game (just date/time/opponent)
6. Submit all at once

**Editing Existing Tournament Game:**
1. Open edit dialog
2. See tournament field
3. Click "Duplicate for New Game" to create another game with same tournament/location pre-filled

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `tournament` column |
| `src/types/basketball.ts` | Add `tournament` to interface |
| `src/hooks/useCloudData.ts` | Handle tournament in CRUD operations |
| `src/components/EditScheduleDialog.tsx` | Add tournament field + duplicate button |
| `src/components/AddScheduleDialog.tsx` | Add tournament field + multi-game entry mode |
| `src/components/QuickAddScheduleDialog.tsx` | Add tournament field |
| `src/pages/GameDetail.tsx` | Display tournament name |
| `src/components/ScheduleCalendar.tsx` | Show tournament badge on game cards |

