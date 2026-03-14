import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Megaphone, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  sent_by: string | null;
  created_at: string;
}

export function AdminBroadcast() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');

  useEffect(() => {
    fetchMessages();
  }, []);

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
    setSending(true);
    try {
      const { error } = await supabase
        .from('broadcast_messages')
        .insert({
          title: title.trim(),
          message: message.trim(),
          target_audience: audience,
          sent_by: session?.user?.id,
        });
      if (error) throw error;
      toast.success('Broadcast sent successfully');
      setTitle('');
      setMessage('');
      setAudience('all');
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
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Send Broadcast
          </CardTitle>
          <CardDescription>Send announcements to users</CardDescription>
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
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="elite">Elite Users</SelectItem>
                <SelectItem value="new_users">New Users (Last 30 Days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()} className="w-full">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Broadcast
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
                  <Badge variant="outline" className="text-[10px]">{audienceLabels[msg.target_audience] || msg.target_audience}</Badge>
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
