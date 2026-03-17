
-- Add lifetime report cards counter to plan_overrides
ALTER TABLE public.plan_overrides ADD COLUMN IF NOT EXISTS lifetime_report_cards_generated integer NOT NULL DEFAULT 0;
