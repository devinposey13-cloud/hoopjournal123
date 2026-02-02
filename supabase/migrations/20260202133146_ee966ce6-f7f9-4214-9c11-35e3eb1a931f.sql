-- Enable realtime for admin notification tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.account_approval_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_feedback;