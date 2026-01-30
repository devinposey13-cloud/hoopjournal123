-- Create account_approval_requests table for tracking user signups requiring approval
CREATE TABLE public.account_approval_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email text,
    username text,
    status text NOT NULL DEFAULT 'pending',
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_approval_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own approval status
CREATE POLICY "Users can view their own approval status"
ON public.account_approval_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all approval requests
CREATE POLICY "Admins can view all approval requests"
ON public.account_approval_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update approval requests
CREATE POLICY "Admins can update approval requests"
ON public.account_approval_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete approval requests
CREATE POLICY "Admins can delete approval requests"
ON public.account_approval_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow insert for authenticated users (during signup)
CREATE POLICY "Users can create their own approval request"
ON public.account_approval_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add is_approved column to player_settings to track approval status
ALTER TABLE public.player_settings ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;