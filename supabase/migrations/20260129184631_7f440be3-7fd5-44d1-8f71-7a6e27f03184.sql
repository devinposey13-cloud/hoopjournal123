-- Create password_reset_requests table for phone users
CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  player_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create reset requests (unauthenticated users need this)
CREATE POLICY "Anyone can create reset requests"
ON public.password_reset_requests FOR INSERT
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.password_reset_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update requests"
ON public.password_reset_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete requests
CREATE POLICY "Admins can delete requests"
ON public.password_reset_requests FOR DELETE
USING (has_role(auth.uid(), 'admin'));