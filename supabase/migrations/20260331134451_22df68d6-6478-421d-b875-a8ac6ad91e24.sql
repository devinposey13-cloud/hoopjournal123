-- Add class_year column to player_settings
ALTER TABLE public.player_settings ADD COLUMN IF NOT EXISTS class_year integer;

-- Migrate existing grade data to class_year
-- Current year is 2026. Mapping:
-- Senior = graduating 2026
-- Junior = 2027
-- Sophomore = 2028
-- Freshman = 2029
-- 8th Grade = 2030
-- 7th Grade = 2031
-- 6th Grade = 2032
UPDATE public.player_settings SET class_year = CASE
  WHEN grade = 'Senior' THEN 2026
  WHEN grade = 'Junior' THEN 2027
  WHEN grade = 'Sophomore' THEN 2028
  WHEN grade = 'Freshman' THEN 2029
  WHEN grade = '8th Grade' THEN 2030
  WHEN grade = '7th Grade' THEN 2031
  WHEN grade = '6th Grade' THEN 2032
  ELSE NULL
END
WHERE class_year IS NULL AND grade IS NOT NULL;

-- Also add class_year to quick_cards for event cards
ALTER TABLE public.quick_cards ADD COLUMN IF NOT EXISTS class_year integer;