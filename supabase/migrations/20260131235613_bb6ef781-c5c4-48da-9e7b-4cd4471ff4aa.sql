-- Create a rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,  -- IP address or other identifier
  action text NOT NULL,      -- e.g., 'validate_reset_token', 'send_password_reset'
  attempts integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  UNIQUE(identifier, action)
);

-- Enable RLS - only service role should access this
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = only service role can access (intentional security hardening)

-- Create index for faster lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(identifier, action);

-- Create index for cleanup of old records
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(last_attempt_at);

-- Add comment documenting the security design
COMMENT ON TABLE public.rate_limits IS 'Rate limiting for edge functions. This table intentionally has no RLS policies - only service role can access it. Used to prevent brute force attacks on password reset and other sensitive endpoints.';

-- Create a function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_seconds integer DEFAULT 300,  -- 5 minutes
  p_block_seconds integer DEFAULT 900    -- 15 minutes block
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_now timestamp with time zone := now();
  v_window_start timestamp with time zone := v_now - (p_window_seconds || ' seconds')::interval;
  v_result jsonb;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM rate_limits
  WHERE identifier = p_identifier AND action = p_action;
  
  -- If blocked, check if block has expired
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'retry_after', EXTRACT(EPOCH FROM (v_record.blocked_until - v_now))::integer,
      'message', 'Too many attempts. Please try again later.'
    );
  END IF;
  
  -- If no record or window expired, reset
  IF v_record.id IS NULL OR v_record.first_attempt_at < v_window_start THEN
    INSERT INTO rate_limits (identifier, action, attempts, first_attempt_at, last_attempt_at, blocked_until)
    VALUES (p_identifier, p_action, 1, v_now, v_now, NULL)
    ON CONFLICT (identifier, action) 
    DO UPDATE SET 
      attempts = 1,
      first_attempt_at = v_now,
      last_attempt_at = v_now,
      blocked_until = NULL;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'blocked', false,
      'attempts_remaining', p_max_attempts - 1
    );
  END IF;
  
  -- Increment attempts
  IF v_record.attempts >= p_max_attempts THEN
    -- Block the identifier
    UPDATE rate_limits
    SET blocked_until = v_now + (p_block_seconds || ' seconds')::interval,
        last_attempt_at = v_now
    WHERE identifier = p_identifier AND action = p_action;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'retry_after', p_block_seconds,
      'message', 'Too many attempts. Please try again later.'
    );
  ELSE
    -- Allow but increment
    UPDATE rate_limits
    SET attempts = attempts + 1,
        last_attempt_at = v_now
    WHERE identifier = p_identifier AND action = p_action;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'blocked', false,
      'attempts_remaining', p_max_attempts - v_record.attempts - 1
    );
  END IF;
END;
$$;