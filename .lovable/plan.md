

## Auto-Approve Existing Users

### Problem Summary

Users who registered before the approval system was implemented (January 30, 2026) are now being blocked because the `is_approved` column defaults to `false`. These users:
- Never went through the new approval flow
- Have no records in `account_approval_requests`
- May already have games recorded (proving they were active users)

**Affected Users Found:**
| User ID | Created | Games Recorded |
|---------|---------|----------------|
| 9447b02a-... | Jan 26 | 1 game |
| d32334c1-... (poseylandon25@gmail.com) | Jan 26 | 1 game |
| cfbba544-... | Jan 30 | 1 game |
| af123656-... | Jan 29 | 0 games |

---

### Solution: Two-Part Auto-Approval Logic

#### Part 1: Database Migration (One-Time Fix)

Run a SQL migration to immediately approve:
1. All users created before January 30, 2026 (the approval system launch date)
2. All users who have recorded at least one game (regardless of creation date)

```text
UPDATE player_settings 
SET is_approved = true 
WHERE 
  -- Created before approval system was implemented
  created_at < '2026-01-30' 
  OR 
  -- Has recorded games (active users)
  user_id IN (SELECT DISTINCT user_id FROM games);
```

#### Part 2: Update Approval Check Hook (Ongoing Logic)

Modify `useApprovalStatus.ts` to automatically consider users approved if:
- They have `is_approved = true` in `player_settings`, OR
- They have at least one game recorded

This provides a safety net for edge cases and ensures active users are never blocked.

---

### Technical Details

**Database Migration:**
- Approve all `player_settings` records where `created_at < '2026-01-30'`
- Approve all users who exist in the `games` table
- Single UPDATE statement with OR conditions

**Hook Changes (`src/hooks/useApprovalStatus.ts`):**
```text
Current logic:
  1. Query player_settings.is_approved
  2. If true → approved
  3. If false or missing → not approved

New logic:
  1. Query player_settings.is_approved
  2. If true → approved
  3. If false, check if user has any games recorded
  4. If has games → approved (and update is_approved to true)
  5. Otherwise → not approved
```

---

### Why Both Parts?

| Approach | Pros | Cons |
|----------|------|------|
| Migration only | Fixes existing users immediately | New edge cases might slip through |
| Hook only | Self-healing logic | Slower (extra query), doesn't fix historical data |
| **Both** | Immediate fix + ongoing protection | Slightly more code |

---

### Testing Plan

After implementation:
1. Verify poseylandon25@gmail.com can log in without seeing the pending approval screen
2. Verify all users with games can access the app
3. Create a new test account (should still require approval)
4. Verify the Admin Panel approval flow still works for new signups

