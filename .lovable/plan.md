
## Plan: Secure QR-Based Claim System — IMPLEMENTED

### What was built

1. **Database** — Extended `quick_cards` with `claim_token`, `claim_status`, `expires_at`, `claim_attempts`, `last_claim_attempt_at`, `recovery_claim`. Created `claim_recovery_requests` table. Added RLS policies.

2. **Edge Function `claim-card`** — Server-side token validation, identity verification (name+jersey for standard, +team for expired), rate limiting (5 attempts/hour), profile auto-fill on success.

3. **QR Codes on Cards** — Each generated card gets a unique `claim_token` and 72-hour `expires_at`. QR code rendered on card pointing to `hoopjournal.me/claim?card_id=...&token=...`.

4. **`/claim` Page** — QR scan landing with auth gate, card preview, identity verification, expired recovery flow, and "Request Access" fallback.

5. **Updated `ClaimCardFlow`** — Manual code entry now includes verification step and expired card recovery.

6. **Admin Claim Management** — Filter cards by status, view attempts, reissue tokens, extend expiry, approve/deny recovery requests.
