
ALTER TABLE public.content_reports 
  ALTER COLUMN ai_response DROP NOT NULL,
  ALTER COLUMN reported_content DROP NOT NULL;

ALTER TABLE public.content_reports 
  ADD COLUMN content_type text NOT NULL DEFAULT 'ai_response',
  ADD COLUMN content_reference_id uuid;
