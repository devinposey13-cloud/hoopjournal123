

## Plan: Claim Your Card Flow

### Overview
Build a player-facing flow where new or existing users can enter a claim code (e.g. `HJ-K7M2P`) to link an event quick card to their profile. For new users, the card data pre-fills their onboarding (name, team, position, number, photo). For existing users, it updates their profile with the card data.

### User Flow

```text
Auth Screen → "Have a card code?" link
       ↓
  ClaimCardDialog opens
       ↓
  User enters code (e.g. HJ-K7M2P)
       ↓
  Lookup quick_cards by claim_code
       ↓
  Show card preview (name, team, photo, archetype)
       ↓
  User confirms → claim_code linked to user
       ↓
  Profile updated with card data + onboarding marked complete
       ↓
  → Dashboard (skips onboarding)
```

### Files to Create/Modify

**1. New: `src/components/ClaimCardFlow.tsx`**
- Dialog component with claim code input (formatted `HJ-XXXXX`)
- On submit: query `quick_cards` where `claim_code = input AND claimed_by_user_id IS NULL`
- Show card preview (player name, team, jersey, photo, archetype/badges)
- Confirm button: updates `quick_cards.claimed_by_user_id` to current user, then updates `player_settings` with card data (name, team, position, number, photo_url, onboarding_completed_at)

**2. Modify: `src/components/AuthForm.tsx`**
- Add a "Have a claim code?" button/link below the auth form
- Store claimed card data in state, pass to parent after successful auth

**3. Modify: `src/pages/Index.tsx`**
- Check URL params or location state for pending claim code after auth
- If user just signed up with a claim code, apply card data to profile and skip onboarding
- Add a "Claim Card" entry point in the onboarding flow as an alternative path

**4. Modify: `src/components/OnboardingFlow.tsx`**
- Add a "Have a claim code?" option on the Welcome step that opens the claim dialog
- If claimed, pre-fill onboarding data from the card and auto-complete

**5. Database: RLS policy update**
- Add SELECT policy on `quick_cards` for authenticated users to look up by claim_code (read-only, limited to unclaimed cards)
- Add UPDATE policy for authenticated users to set `claimed_by_user_id` on unclaimed cards

### Database Migration

```sql
-- Allow authenticated users to look up unclaimed cards by claim code
CREATE POLICY "Users can lookup unclaimed cards by claim code"
ON public.quick_cards
FOR SELECT
TO authenticated
USING (claimed_by_user_id IS NULL AND claim_code IS NOT NULL);

-- Allow authenticated users to claim unclaimed cards
CREATE POLICY "Users can claim unclaimed cards"
ON public.quick_cards
FOR UPDATE
TO authenticated
USING (claimed_by_user_id IS NULL)
WITH CHECK (claimed_by_user_id = auth.uid());
```

### Technical Details

- **ClaimCardFlow component**: Self-contained dialog with 3 states: input → preview → success
- **Profile update on claim**: Sets `name`, `team`, `position`, `number`, `avatar_url` from the quick card, plus `onboarding_completed_at = now()` to skip onboarding
- **Duplicate claim prevention**: Query filters for `claimed_by_user_id IS NULL`; if already claimed, show "Code already used" error
- **Entry points**: AuthForm (pre-auth), OnboardingFlow welcome step (post-auth), and Settings (for existing users who got a card later)

### Files Modified
- `src/components/ClaimCardFlow.tsx` (new)
- `src/components/AuthForm.tsx`
- `src/components/OnboardingFlow.tsx`
- `src/pages/Index.tsx`
- Database migration for RLS policies

