import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, Megaphone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  target_user_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function BroadcastNotifications() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchMessages();
  }, [session?.user?.id]);

  const fetchMessages = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('broadcast_messages')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) return;

    // Filter: show messages targeted to 'all', or specifically to this user
    const userId = session.user.id;
    const relevant = (data as BroadcastMessage[]).filter((msg) => {
      if (msg.target_audience === 'specific_user') {
        return msg.target_user_id === userId;
      }
      // 'all' audience messages are visible to everyone
      return msg.target_audience === 'all';
    });

    setMessages(relevant);
  };

  const dismissMessage = async (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));

    // Mark as read in DB for this user (for specific_user messages)
    const msg = messages.find((m) => m.id === id);
    if (msg?.target_audience === 'specific_user' && msg.target_user_id === session?.user?.id) {
      await supabase
        .from('broadcast_messages')
        .update({ is_read: true })
        .eq('id', id);
    }
  };

  const visibleMessages = messages.filter((m) => !dismissedIds.has(m.id));

  if (visibleMessages.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleMessages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            'relative flex items-start gap-3 rounded-lg border p-3',
            msg.target_audience === 'specific_user'
              ? 'bg-primary/5 border-primary/20'
              : 'bg-muted/50 border-border/50'
          )}
        >
          <div className="shrink-0 mt-0.5">
            {msg.target_audience === 'specific_user' ? (
              <Mail className="w-4 h-4 text-primary" />
            ) : (
              <Megaphone className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{msg.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{msg.message}</p>
          </div>
          <button
            onClick={() => dismissMessage(msg.id)}
            className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
