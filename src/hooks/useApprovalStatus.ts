import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const APPROVAL_MODE_KEY = 'hj_approval_mode';

export function useApprovalStatus() {
  const { user } = useAuth();
  const cachedMode = localStorage.getItem(APPROVAL_MODE_KEY);
  const [isApproved, setIsApproved] = useState<boolean | null>(cachedMode === 'automatic' ? true : null);
  const [loading, setLoading] = useState(cachedMode !== 'automatic');
  const notificationSentRef = useRef<Set<string>>(new Set());

  const checkApprovalStatus = useCallback(async () => {
    if (!user) {
      setIsApproved(null);
      setLoading(false);
      return;
    }

    try {
      // Fast-path: check if approval mode is automatic
      try {
        const { data: flagData } = await supabase
          .from('feature_flags')
          .select('flag_value')
          .eq('flag_key', 'user_approval_mode')
          .eq('is_enabled', true)
          .maybeSingle();
        
        if (flagData?.flag_value === 'automatic') {
          setIsApproved(true);
          setLoading(false);
          return;
        }
      } catch {
        // Continue with normal check if flag read fails
      }

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
            .select('created_at, notification_sent')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();
          
          if (approvalData && !approvalData.notification_sent) {
            // Check if created within last 5 minutes (likely an OAuth signup needing notification)
            const createdAt = new Date(approvalData.created_at);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            if (createdAt > fiveMinutesAgo) {
              // Fallback: Send admin notification if webhook didn't fire
              notificationSentRef.current.add(user.id);
              try {
                await supabase.functions.invoke('notify-admin-signup', {
                  body: {
                    username: primaryProfile.username || 'Unknown',
                    email: user.email || null,
                  },
                });
                // Mark as sent to prevent duplicates
                await supabase
                  .from('account_approval_requests')
                  .update({ notification_sent: true })
                  .eq('user_id', user.id);
                console.log('Fallback admin notification sent for OAuth signup');
              } catch (notifyError) {
                console.error('Error sending fallback admin notification:', notifyError);
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
