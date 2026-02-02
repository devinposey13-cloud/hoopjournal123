import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useApprovalStatus() {
  const { user } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const notificationSentRef = useRef<Set<string>>(new Set());

  const checkApprovalStatus = useCallback(async () => {
    if (!user) {
      setIsApproved(null);
      setLoading(false);
      return;
    }

    try {
      // Check player_settings for is_approved flag
      // With multi-profile support, users can have multiple rows - check if ANY profile is approved
      const { data: settingsData, error: settingsError } = await supabase
        .from('player_settings')
        .select('is_approved, username')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (settingsError) {
        console.error('Error checking approval status:', settingsError);
        setIsApproved(false);
        setLoading(false);
        return;
      }

      // If no settings data exists yet (trigger may not have completed), user needs approval
      if (!settingsData || settingsData.length === 0) {
        console.log('No player_settings found - user needs approval');
        setIsApproved(false);
        setLoading(false);
        return;
      }

      // Get the first profile (original) for approval check and username
      const primaryProfile = settingsData[0];

      // If any profile is approved, user is approved (use the first/original profile's status)
      if (primaryProfile.is_approved) {
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
        setIsApproved(false);
        
        // For OAuth users: Check if admin notification was already sent for this session
        // The trigger creates records but can't call edge functions
        // Send notification if we haven't already in this session
        if (primaryProfile && !notificationSentRef.current.has(user.id)) {
          // Check approval request status to see if it's still pending (newly created)
          const { data: approvalData } = await supabase
            .from('account_approval_requests')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();
          
          if (approvalData) {
            // Check if created within last 5 minutes (likely an OAuth signup needing notification)
            const createdAt = new Date(approvalData.created_at);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            if (createdAt > fiveMinutesAgo) {
              // Send admin notification for OAuth signup
              notificationSentRef.current.add(user.id);
              try {
                await supabase.functions.invoke('notify-admin-signup', {
                  body: {
                    username: primaryProfile.username || 'Unknown',
                    email: user.email || null,
                  },
                });
                console.log('Admin notification sent for OAuth signup');
              } catch (notifyError) {
                console.error('Error sending admin notification:', notifyError);
              }
            }
          }
        }
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
