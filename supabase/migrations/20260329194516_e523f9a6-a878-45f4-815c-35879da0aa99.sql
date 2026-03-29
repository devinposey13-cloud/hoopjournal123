ALTER TABLE public.conditioning_sessions
  ADD COLUMN IF NOT EXISTS coach_trust_score integer,
  ADD COLUMN IF NOT EXISTS coach_trust_band text,
  ADD COLUMN IF NOT EXISTS trust_reasons jsonb;