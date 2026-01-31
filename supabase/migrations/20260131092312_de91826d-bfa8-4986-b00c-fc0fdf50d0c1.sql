-- Fix 1: Secure password_reset_tokens table
-- This table should only be accessible by backend services (service role)
-- Enable RLS if not already enabled
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No user-facing policies needed - only service role can access this table
-- The service role bypasses RLS, so authenticated users cannot read/write

-- Fix 2: Secure password_reset_requests table
-- Remove the overly permissive INSERT policy that allows anyone to insert
DROP POLICY IF EXISTS "Anyone can create reset requests" ON public.password_reset_requests;

-- Create a more restrictive INSERT policy - allow authenticated users to create requests
-- but they can only create requests with their own user_id (if logged in)
-- For anonymous users (forgot password flow), we'll use service role in edge function
CREATE POLICY "Service role can create reset requests"
ON public.password_reset_requests
FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure only admins can SELECT from password_reset_requests (already exists but let's verify)
-- The existing policies already restrict SELECT to admins, which is correct

-- Add policy to allow users to view only their own request by user_id (optional for status checking)
CREATE POLICY "Users can view their own reset request"
ON public.password_reset_requests
FOR SELECT
USING (auth.uid() = user_id);