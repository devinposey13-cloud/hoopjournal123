import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from './useAdmin';

interface AdminNotificationCounts {
  pendingApprovals: number;
  pendingReports: number;
  pendingResets: number;
  unreadFeedback: number;
  totalPending: number;
}

export function useAdminNotifications() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [counts, setCounts] = useState<AdminNotificationCounts>({
    pendingApprovals: 0,
    pendingReports: 0,
    pendingResets: 0,
    unreadFeedback: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      if (adminLoading || !isAdmin) {
        setCounts({
          pendingApprovals: 0,
          pendingReports: 0,
          pendingResets: 0,
          unreadFeedback: 0,
          totalPending: 0,
        });
        setLoading(false);
        return;
      }

      try {
        // Fetch all counts in parallel
        const [approvalsResult, reportsResult, resetsResult, feedbackResult] = await Promise.all([
          supabase
            .from('account_approval_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('content_reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('password_reset_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('user_feedback')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'unread'),
        ]);

        const pendingApprovals = approvalsResult.count ?? 0;
        const pendingReports = reportsResult.count ?? 0;
        const pendingResets = resetsResult.count ?? 0;
        const unreadFeedback = feedbackResult.count ?? 0;
        const totalPending = pendingApprovals + pendingReports + pendingResets + unreadFeedback;

        setCounts({
          pendingApprovals,
          pendingReports,
          pendingResets,
          unreadFeedback,
          totalPending,
        });
      } catch (error) {
        console.error('Error fetching admin notification counts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [isAdmin, adminLoading]);

  // Format count for badge display (99+ for large numbers)
  const formatCount = (count: number): string => {
    if (count > 99) return '99+';
    return count.toString();
  };

  return {
    ...counts,
    loading,
    formattedTotal: formatCount(counts.totalPending),
  };
}
