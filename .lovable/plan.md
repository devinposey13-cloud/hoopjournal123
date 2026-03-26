

## Plan: Secure QR-Based Claim System for Event Quick Mode Cards

This is a significant feature spanning database schema changes, a new edge function, a new claim page, admin tools, and QR generation. Here is the implementation broken into phases.

### Phase 1: Database Schema Changes

**Migration** — Extend `quick_cards` table and create `claim_recovery_requests` table:

```sql
-- Add new columns to quick_cards
ALTER TABLE public.quick_cards
  ADD COLUMN claim_token text,
  ADD COLUMN claim_status text NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN claim_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN last_claim_attempt_at timestamptz,
  ADD COLUMN recovery_claim boolean NOT NULL DEFAULT false;

-- Backfill: set expires_at for existing cards, generate tokens
UPDATE public.quick_cards
SET expires_at = created_at + interval '72 hours',
    claim_token = encode(gen_random_bytes(16), 'hex')
WHERE claim_token IS NULL;

-- Create claim_recovery_requests table
CREATE TABLE public.claim_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.quick_cards(id) ON DELETE CASCADE,
  entered_name text NOT NULL,
  entered_team text NOT NULL,
  entered_jersey integer NOT NULL,
  entered_email text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.claim_recovery_requests ENABLE ROW LEVEL SECURITY;

-- RLS for recovery requests
CREATE POLICY "Authenticated users can create recovery requests"
ON public.claim_recovery_requests FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage recovery requests"
ON public.claim_recovery_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

Update `quick_cards` RLS policies to allow SELECT by token (for unauthenticated QR scan landing):
- Add a SELECT policy allowing lookup by `claim_token` for authenticated users

### Phase 2: Edge Function — `claim-card`

New edge function `supabase/functions/claim-card/index.ts` that handles server-side validation:

- Accepts `{ card_id, token, player_name, jersey_number, team_name? }`
- Validates token matches, checks `claim_status`
- If within 72 hours: require name + jersey match (case-insensitive, trimmed)
- If expired: require name + team + jersey match (stronger verification)
- Rate limit: 5 failed attempts per card per hour using existing `check_rate_limit` function
- On success: update `quick_cards` (set `claim_status = 'claimed'`, `claimed_by_user_id`), update `player_settings` with card data
- Returns card data on success for the UI to show confirmation

### Phase 3: QR Code Generation in Admin Quick Mode

**`src/components/admin/AdminQuickMode.tsx`**:
- After card generation, auto-generate a `claim_token` (already done via migration default, but also set on insert)
- Set `expires_at = now() + 72 hours` on insert
- Generate QR code URL: `https://hoopjournal.me/claim?card_id={id}&token={claim_token}`
- Render QR on the card template using a QR library (e.g., `qrcode.react`)
- Add "Scan to claim your profile" and "Claim within 72 hours" text near QR on the card
- Remove the visible claim code text from the card (keep it in DB for manual fallback)

### Phase 4: Claim Page — `/claim`

New page `src/pages/ClaimCard.tsx`:
- Reads `card_id` and `token` from URL query params
- If user is not authenticated: show auth form first, then proceed
- Calls the `claim-card` edge function for validation
- **Standard flow** (within 72 hours):
  - Shows partial card preview (player name, team, jersey, blurred photo)
  - Asks user to confirm: enter name + jersey number
  - On match: claims card, auto-fills onboarding, redirects to dashboard
- **Expired flow** (after 72 hours):
  - Shows "This card has expired, but we can still recover it"
  - Asks for name + team + jersey
  - On match: claims with `recovery_claim = true`
  - On mismatch: shows "Request Access" form (stores in `claim_recovery_requests`)
- **Already claimed**: shows "This card has already been claimed"
- **Rate limited**: shows "Too many attempts. Try again later."

Add route in `App.tsx`: `<Route path="/claim" element={<ClaimCard />} />`

### Phase 5: Update Existing ClaimCardFlow

Update `src/components/ClaimCardFlow.tsx` to also work with the new system:
- Manual code entry still works as a fallback
- After lookup, route through the same verification (name + jersey match)
- Check `claim_status` and `expires_at`

### Phase 6: Admin Claim Management

Add a "Claim Management" tab/section in the admin panel:

**`src/components/admin/AdminClaimManagement.tsx`** (new):
- List all quick cards with filters: unclaimed, claimed, expired, recovery requested
- For each card show: player name, team, claim status, attempts, expires_at
- Actions per card:
  - Approve recovery request manually
  - Reissue token (generate new `claim_token`, reset `expires_at`, reset `claim_status` to unclaimed)
  - Extend expiration
  - Mark as claimed manually

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | New migration for schema changes |
| `supabase/functions/claim-card/index.ts` | New edge function |
| `src/pages/ClaimCard.tsx` | New claim page |
| `src/App.tsx` | Add `/claim` route |
| `src/components/admin/AdminQuickMode.tsx` | Add token/expiry on insert, QR on card |
| `src/components/ClaimCardFlow.tsx` | Add verification step, expiration handling |
| `src/components/admin/AdminClaimManagement.tsx` | New admin section |
| `src/components/AdminPanel.tsx` | Add claim management tab |

### Dependencies
- `qrcode.react` package for QR generation on event cards

### Security Notes
- Token validated server-side only (edge function)
- Rate limiting uses existing `check_rate_limit` DB function
- Identity verification prevents unauthorized claims
- QR URL does not expose the claim code — only the secure token
- Expired cards require stronger verification (3 fields vs 2)

