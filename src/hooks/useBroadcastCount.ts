import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDismissedNotifications } from '@/hooks/useDismissedNotifications';

export function useBroadcastCount() {
  const { session } = useAuth();
  const { dismissedIds } = useDismissedNotifications();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchCount = async () => {
      const userId = session.user.id;

      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('id, target_audience, target_user_id')
        .eq('is_read', false);

      if (error || !data) return;

      const relevant = data.filter((msg) => {
        if (dismissedIds.includes(msg.id)) return false;
        if (msg.target_audience === 'specific_user') {
          return msg.target_user_id === userId;
        }
        return msg.target_audience === 'all';
      });

      setCount(relevant.length);
    };

    fetchCount();

    const channel = supabase
      .channel('broadcast-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadcast_messages' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, dismissedIds]);

  return count;
}
