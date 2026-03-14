import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Megaphone, Send, Search, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  target_user_id: string | null;
  sent_by: string | null;
  created_at: string;
}

interface UserResult {
  id: string;
  user_id: string;
  name: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function AdminBroadcast() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');

  // User search state
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Debounced user search
  useEffect(() => {
    if (audience !== 'specific_user' || userSearch.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(() => searchUsers(userSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [userSearch, audience]);

  async function searchUsers(query: string) {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('player_settings')
        .select('id, user_id, name, display_name, username, avatar_url')
        .or(`name.ilike.%${query}%,display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(8);
      if (error) throw error;
      setUserResults((data as UserResult[]) || []);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  }

  async function fetchMessages() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setMessages((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (audience === 'specific_user' && !selectedUser) {
      toast.error('Please select a user');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase
        .from('broadcast_messages')
        .insert({
          title: title.trim(),
          message: message.trim(),
          target_audience: audience,
          target_user_id: audience === 'specific_user' ? selectedUser?.user_id : null,
          sent_by: session?.user?.id,
        } as any);
      if (error) throw error;
      toast.success(
        audience === 'specific_user'
          ? `Message sent to ${selectedUser?.display_name || selectedUser?.name}`
          : 'Broadcast sent successfully'
      );
      setTitle('');
      setMessage('');
      setAudience('all');
      setSelectedUser(null);
      setUserSearch('');
      fetchMessages();
    } catch (err) {
      console.error('Error sending broadcast:', err);
      toast.error('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  }

  const audienceLabels: Record<string, string> = {
    all: 'All Users',
    elite: 'Elite Users',
    new_users: 'New Users (Last 30 Days)',
    specific_user: 'Specific User',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Send Broadcast
          </CardTitle>
          <CardDescription>Send announcements to users or direct messages to individuals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Write your announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Send To</Label>
            <Select value={audience} onValueChange={(v) => {
              setAudience(v);
              if (v !== 'specific_user') {
                setSelectedUser(null);
                setUserSearch('');
                setUserResults([]);
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="elite">Elite Users</SelectItem>
                <SelectItem value="new_users">New Users (Last 30 Days)</SelectItem>
                <SelectItem value="specific_user">Specific User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User search when "Specific User" is selected */}
          {audience === 'specific_user' && (
            <div className="space-y-2">
              <Label>Select User</Label>
              {selectedUser ? (
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {selectedUser.display_name || selectedUser.name}
                    </p>
                    {selectedUser.username && (
                      <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearch('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or username..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {userResults.length > 0 && (
                    <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                      {userResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setUserSearch('');
                            setUserResults([]);
                          }}
                          className="flex items-center gap-3 w-full p-2.5 text-left hover:bg-secondary/50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.display_name || u.name}</p>
                            {u.username && (
                              <p className="text-xs text-muted-foreground">@{u.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {userSearch.trim().length >= 2 && !searching && userResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim() || (audience === 'specific_user' && !selectedUser)}
            className="w-full"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {audience === 'specific_user' ? 'Send Direct Message' : 'Send Broadcast'}
          </Button>
        </CardContent>
      </Card>

      {/* Previous broadcasts */}
      {messages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Broadcasts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{msg.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {msg.target_audience === 'specific_user'
                      ? '📩 Direct Message'
                      : audienceLabels[msg.target_audience] || msg.target_audience}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{msg.message}</p>
                <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
