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
      // First check player_settings for is_approved flag
      const { data: settingsData, error: settingsError } = await supabase
        .from('player_settings')
        .select('is_approved')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) {
        console.error('Error checking approval status:', settingsError);
        setIsApproved(false);
        setLoading(false);
        return;
      }

      // If already approved, we're done
      if (settingsData?.is_approved) {
        setIsApproved(true);
        setLoading(false);
        return;
      }

      // Self-healing: Check if user has any games recorded (active user)
      const { count, error: gamesError } = await supabase
        .from('games')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (gamesError) {
        console.error('Error checking games:', gamesError);
        setIsApproved(false);
        setLoading(false);
        return;
      }

      // If user has games, auto-approve them
      if (count && count > 0) {
        // Update the database to mark them as approved
        await supabase
          .from('player_settings')
          .update({ is_approved: true })
          .eq('user_id', user.id);
        
        setIsApproved(true);
      } else {
        // No games and not approved - they need approval
        setIsApproved(settingsData ? false : false);
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
