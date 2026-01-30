import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useApprovalStatus() {
  const { user } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkApprovalStatus = useCallback(async () => {
    if (!user) {
      setIsApproved(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('player_settings')
        .select('is_approved')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking approval status:', error);
        // If there's an error or no record, assume not approved
        setIsApproved(false);
      } else if (data) {
        setIsApproved(data.is_approved);
      } else {
        // No player_settings record yet - new signup
        setIsApproved(false);
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
      setIsApproved(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkApprovalStatus();
  }, [checkApprovalStatus]);

  return { isApproved, loading, refetch: checkApprovalStatus };
}
