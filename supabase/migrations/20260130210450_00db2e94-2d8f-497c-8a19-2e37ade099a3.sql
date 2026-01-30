-- Create password reset tokens table for custom email flow
CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast token lookups
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);

-- Create index for rate limiting by email
CREATE INDEX idx_password_reset_tokens_email_created ON public.password_reset_tokens(email, created_at);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No public access - tokens are only managed server-side via service role
-- This ensures tokens can only be created/validated through edge functions