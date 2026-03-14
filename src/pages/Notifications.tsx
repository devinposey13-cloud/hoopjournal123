import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { Navigation, Tab } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useCloudData } from '@/hooks/useCloudData';
import { Bell, Mail, Megaphone, Check, CheckCheck, Inbox, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  target_user_id: string | null;
  is_read: boolean;
  created_at: string;
}

const DISMISSED_KEY = 'hoop-journal-dismissed-notifications';

function getDismissedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function addDismissedId(id: string) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  const { seasons, activeSeason, switchSeason, createSeason, deleteSeason, loading } = useCloudData();

  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds());

  useEffect(() => {
    if (!user) return;
    fetchMessages();
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoadingMessages(true);

    const { data, error } = await supabase
      .from('broadcast_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setLoadingMessages(false);
      return;
    }

    const relevant = (data as BroadcastMessage[]).filter((msg) => {
      if (msg.target_audience === 'specific_user') {
        return msg.target_user_id === user.id;
      }
      return msg.target_audience === 'all';
    });

    setMessages(relevant);
    setLoadingMessages(false);
  };

  const markAsRead = async (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    await supabase.from('broadcast_messages').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = messages.filter((m) => !m.is_read).map((m) => m.id);
    if (unreadIds.length === 0) return;

    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));

    const specificUnread = messages.filter(
      (m) => !m.is_read && m.target_audience === 'specific_user' && m.target_user_id === user?.id
    );
    for (const msg of specificUnread) {
      await supabase.from('broadcast_messages').update({ is_read: true }).eq('id', msg.id);
    }
  };

  const deleteMessage = async (msg: BroadcastMessage) => {
    // For direct messages, delete from DB; for broadcasts, dismiss locally
    if (msg.target_audience === 'specific_user' && msg.target_user_id === user?.id) {
      const { error } = await supabase.from('broadcast_messages').delete().eq('id', msg.id);
      if (error) {
        // Fallback to local dismiss if DB delete fails (RLS)
        addDismissedId(msg.id);
        setDismissedIds((prev) => [...prev, msg.id]);
      }
    } else {
      addDismissedId(msg.id);
      setDismissedIds((prev) => [...prev, msg.id]);
    }
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    toast.success('Notification removed');
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === 'dashboard') navigate('/');
    else if (tab === 'games' || tab === 'log') navigate('/log/history');
    else if (tab === 'stats') navigate('/progress/overview');
    else navigate('/', { state: { tab } });
  };

  if (!authLoading && !user) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  const visibleMessages = messages.filter((m) => !dismissedIds.includes(m.id));
  const filteredMessages = filter === 'unread' ? visibleMessages.filter((m) => !m.is_read) : visibleMessages;
  const unreadCount = visibleMessages.filter((m) => !m.is_read).length;

  return (
    <div className={cn('min-h-screen bg-background', isMobile ? 'pb-20' : '')}>
      {!isMobile && (
        <Navigation
          activeTab="dashboard"
          onTabChange={handleTabChange}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={switchSeason}
          onCreateSeason={async (name) => { await createSeason(name); }}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      )}

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="space-y-1 mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Messages and announcements from the Hoop Journal team.
          </p>
        </div>

        {/* Filter + Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filter === 'all' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                filter === 'unread' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Messages list */}
        {loadingMessages ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {filter === 'unread'
                ? "You're all caught up!"
                : 'Messages from the team will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -80, transition: { duration: 0.2 } }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'relative group flex items-start gap-3 rounded-xl border p-4 transition-colors',
                    !msg.is_read
                      ? msg.target_audience === 'specific_user'
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/60 border-border'
                      : 'bg-card border-border/50 opacity-75'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center',
                      msg.target_audience === 'specific_user'
                        ? 'bg-primary/10'
                        : 'bg-muted'
                    )}
                  >
                    {msg.target_audience === 'specific_user' ? (
                      <Mail className="w-4 h-4 text-primary" />
                    ) : (
                      <Megaphone className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-tight', !msg.is_read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground')}>
                        {msg.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={cn(
                          'inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full',
                          msg.target_audience === 'specific_user'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {msg.target_audience === 'specific_user' ? 'Direct message' : 'Announcement'}
                      </span>
                      {!msg.is_read && (
                        <button
                          onClick={() => markAsRead(msg.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteMessage(msg)}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!msg.is_read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isMobile && (
        <BottomNavigation
          activeTab="dashboard"
          onTabChange={handleTabChange}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={switchSeason}
          onCreateSeason={async (name) => { await createSeason(name); }}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}