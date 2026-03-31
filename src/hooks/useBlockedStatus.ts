import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useBlockedStatus() {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsBlocked(false);
      setLoading(false);
      return;
    }

    async function checkBlocked() {
      try {
        const { data } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('user_id', user!.id)
          .eq('is_active', true)
          .maybeSingle();

        setIsBlocked(!!data);
      } catch {
        setIsBlocked(false);
      } finally {
        setLoading(false);
      }
    }

    checkBlocked();
  }, [user?.id]);

  return { isBlocked, loading };
}
