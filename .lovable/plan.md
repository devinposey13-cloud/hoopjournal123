
## Plan: Let the Same User Reuse a Claim Code After “Start Over”

### Root cause
`Start Over` resets the active profile data, but it does not clear the quick card’s `claimed_by_user_id`.  
Right now the claim flow only allows:
- lookup of `quick_cards` where `claimed_by_user_id IS NULL`
- update of `quick_cards` where `claimed_by_user_id IS NULL`

So after a reset, the same account is blocked from importing the same card again.

### Implementation
**1. Update the claim flow UI logic**
In `src/components/ClaimCardFlow.tsx`:
- Change lookup so it can find a card when:
  - it is unclaimed, or
  - it is already claimed by the current user
- Change the claim/update step so it succeeds when:
  - the card is unclaimed, or
  - the card is already linked to the current user
- Keep the profile update behavior the same so name, team, jersey number, photo, grade, and position get written back into the active profile again
- Update the error copy so “already claimed” only appears when the card belongs to someone else

**2. Update backend access rules**
Create a migration to replace the current `quick_cards` RLS policies with same-user re-claim logic:
- **SELECT policy:** allow lookup by claim code if `claim_code IS NOT NULL` and either:
  - `claimed_by_user_id IS NULL`, or
  - `claimed_by_user_id = auth.uid()`
- **UPDATE policy:** allow claim/re-claim if either:
  - `claimed_by_user_id IS NULL`, or
  - `claimed_by_user_id = auth.uid()`
- Keep `WITH CHECK (claimed_by_user_id = auth.uid())` so users still cannot assign cards to another account

### Why this approach
This solves your restart scenario without making cards globally reusable by anyone.  
It keeps the behavior aligned with the intent:
- same user can re-import after restarting a profile
- a different user still cannot take over someone else’s claimed card

### Files to modify
- `src/components/ClaimCardFlow.tsx`
- `supabase/migrations/...` for `quick_cards` RLS policy updates

### Expected result
After this change:
1. user imports a card code
2. profile is created/populated
3. user uses **Start Over**
4. same user enters the same claim code again
5. card data is imported into the active profile successfully

### Technical notes
- No table schema change is needed
- `DangerZoneSection` does not need to clear `quick_cards.claimed_by_user_id`
- This is safer than removing claim ownership entirely, and more precise than making claim codes unlimited for all users
