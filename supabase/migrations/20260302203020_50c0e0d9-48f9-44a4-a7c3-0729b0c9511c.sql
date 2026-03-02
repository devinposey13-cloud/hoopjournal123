-- Add promo fields to plan_overrides for AAU event promotion
ALTER TABLE public.plan_overrides
  ADD COLUMN IF NOT EXISTS promo_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_locked_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_start_date timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_source text DEFAULT NULL;