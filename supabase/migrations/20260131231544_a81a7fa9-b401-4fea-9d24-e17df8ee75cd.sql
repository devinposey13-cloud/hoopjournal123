-- Add foreign key constraint to account_approval_requests to cascade delete when user is deleted
-- This prevents orphaned approval records when users are deleted from Cloud

-- First add the foreign key with CASCADE delete
ALTER TABLE public.account_approval_requests
ADD CONSTRAINT account_approval_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;