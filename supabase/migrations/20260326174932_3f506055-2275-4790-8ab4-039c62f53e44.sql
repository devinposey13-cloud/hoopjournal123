
-- Add new columns to quick_cards for secure claim system
ALTER TABLE public.quick_cards
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS claim_status text NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_claim_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_claim boolean NOT NULL DEFAULT false;

-- Backfill existing cards with tokens and expiry
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
  user_id uuid,
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

-- Add SELECT policy for quick_cards by claim_token
CREATE POLICY "Users can lookup cards by claim token"
ON public.quick_cards FOR SELECT TO authenticated
USING (claim_token IS NOT NULL);
