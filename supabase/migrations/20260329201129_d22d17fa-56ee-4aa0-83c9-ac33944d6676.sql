ALTER TABLE public.conditioning_sessions 
ADD COLUMN IF NOT EXISTS conditioning_grade text,
ADD COLUMN IF NOT EXISTS grade_label text;