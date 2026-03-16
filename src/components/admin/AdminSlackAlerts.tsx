import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Wifi, WifiOff, Send, Trash2, Settings2, Clock, History, Bell, BellOff } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SlackConfig {
  id: string;
  webhook_url: string;
  is_active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
  created_at: string;
}

interface AlertPreference {
  id: string;
  category: string;
  is_enabled: boolean;
  severity: string;
  frequency: string;
  channel_override: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface AlertHistoryItem {
  id: string;
  category: string;
  severity: string;
  title: string;
  message_preview: string | null;
  channel: string | null;
  delivery_status: string;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  delivered_at: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  new_user_signup: { label: 'New User Signups', description: 'When a new account is created', icon: '👤' },
  new_paid_subscription: { label: 'Paid Subscriptions', description: 'New paid plan conversions', icon: '💳' },
  failed_payment: { label: 'Failed Payments', description: 'Payment failures and declines', icon: '❌' },
  canceled_subscription: { label: 'Cancellations', description: 'Subscription cancellations', icon: '🔄' },
  new_support_request: { label: 'Support Requests', description: 'New support/contact submissions', icon: '📩' },
  reported_content: { label: 'Reported Content', description: 'Flagged comments, videos, profiles', icon: '🚩' },
  user_feedback: { label: 'User Feedback', description: 'In-app feedback submissions', icon: '💬' },
  backend_failure: { label: 'Backend Failures', description: 'AI, API, or system errors', icon: '🔥' },
  milestone_alert: { label: 'Milestones', description: 'Growth and usage milestones', icon: '🏆' },
  admin_audit: { label: 'Admin Actions', description: 'Admin activity audit trail', icon: '🔒' },
  churn_risk: { label: 'Churn Risk', description: 'Inactive or at-risk users', icon: '📉' },
  high_engagement: { label: 'High Engagement', description: 'Power users and streaks', icon: '🌟' },
};

function maskWebhook(url: string): string {
  try {
    const parts = url.split('/');
    if (parts.length > 2) {
      const last = parts[parts.length - 1];
      return `.../${last.substring(0, 6)}${'•'.repeat(8)}`;
    }
    return '•••••••••••';
  } catch {
    return '•••••••••••';
  }
}

export function AdminSlackAlerts() {
  const { session } = useAuth();
  const [config, setConfig] = useState<SlackConfig | null>(null);
  const [preferences, setPreferences] = useState<AlertPreference[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('categories');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, prefsRes, historyRes] = await Promise.all([
        supabase
          .from('slack_integration_config')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('slack_alert_preferences')
          .select('*')
          .order('category'),
        supabase
          .from('slack_alert_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      setConfig(configRes.data as any);
      setPreferences((prefsRes.data as any) || []);
      setHistory((historyRes.data as any) || []);
    } catch (error) {
      console.error('Error fetching Slack config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime history updates
  useEffect(() => {
    const channel = supabase
      .channel('slack-alert-history')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'slack_alert_history' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  async function handleConnect() {
    if (!webhookUrl.trim().startsWith('https://hooks.slack.com/')) {
      toast.error('Please enter a valid Slack webhook URL');
      return;
    }
    setSaving(true);
    try {
      // Deactivate existing configs
      if (config) {
        await supabase
          .from('slack_integration_config')
          .update({ is_active: false })
          .eq('id', config.id);
      }
      const { error } = await supabase
        .from('slack_integration_config')
        .insert({
          webhook_url: webhookUrl.trim(),
          is_active: true,
          created_by: session?.user?.id,
        });
      if (error) throw error;
      toast.success('Slack connected successfully');
      setShowConnectDialog(false);
      setWebhookUrl('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Slack');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!config) return;
    try {
      await supabase
        .from('slack_integration_config')
        .update({ is_active: false })
        .eq('id', config.id);
      toast.success('Slack disconnected');
      setConfig(null);
      setShowDisconnectDialog(false);
    } catch {
      toast.error('Failed to disconnect');
    }
  }

  async function handleToggleCategory(pref: AlertPreference, enabled: boolean) {
    try {
      await supabase
        .from('slack_alert_preferences')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', pref.id);
      setPreferences(prev => prev.map(p => p.id === pref.id ? { ...p, is_enabled: enabled } : p));
    } catch {
      toast.error('Failed to update preference');
    }
  }

  async function handleUpdateSeverity(pref: AlertPreference, severity: string) {
    try {
      await supabase
        .from('slack_alert_preferences')
        .update({ severity, updated_at: new Date().toISOString() })
        .eq('id', pref.id);
      setPreferences(prev => prev.map(p => p.id === pref.id ? { ...p, severity } : p));
    } catch {
      toast.error('Failed to update severity');
    }
  }

  async function handleUpdateFrequency(pref: AlertPreference, frequency: string) {
    try {
      await supabase
        .from('slack_alert_preferences')
        .update({ frequency, updated_at: new Date().toISOString() })
        .eq('id', pref.id);
      setPreferences(prev => prev.map(p => p.id === pref.id ? { ...p, frequency } : p));
    } catch {
      toast.error('Failed to update frequency');
    }
  }

  async function handleSendTest(category: string) {
    setSendingTest(category);
    try {
      const catInfo = CATEGORY_LABELS[category] || { label: category, description: '' };
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-slack-alert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            category,
            severity: 'info',
            title: `Test Alert: ${catInfo.label}`,
            summary: `This is a test alert for the "${catInfo.label}" category. If you see this in Slack, the integration is working correctly.`,
            details: {
              'Category': catInfo.label,
              'Triggered By': 'Admin Test',
              'Environment': 'Production',
            },
            is_test: true,
          }),
        },
      );
      const data = await response.json();
      if (data.sent) {
        toast.success('Test alert sent to Slack');
        fetchData();
      } else if (data.skipped) {
        toast.info(`Alert skipped: ${data.reason}`);
      } else {
        toast.error(`Alert failed: ${data.reason || 'Unknown error'}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test');
    } finally {
      setSendingTest(null);
    }
  }

  const todayAlerts = history.filter(h => {
    const today = new Date();
    const alertDate = new Date(h.created_at);
    return alertDate.toDateString() === today.toDateString();
  });
  const todaySent = todayAlerts.filter(h => h.delivery_status === 'delivered').length;
  const todayFailed = todayAlerts.filter(h => h.delivery_status === 'failed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Integration Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {config ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                Slack Integration
              </CardTitle>
              <CardDescription>
                {config ? 'Connected and active' : 'Not connected'}
              </CardDescription>
            </div>
            <Badge variant={config ? 'default' : 'secondary'}>
              {config ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Webhook</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{maskWebhook(config.webhook_url)}</code>
              </div>
              <div>
                <span className="text-muted-foreground block">Last Success</span>
                <span className="flex items-center gap-1">
                  {config.last_success_at ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      {formatDistanceToNow(new Date(config.last_success_at), { addSuffix: true })}
                    </>
                  ) : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Last Failure</span>
                <span className="flex items-center gap-1">
                  {config.last_failure_at ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                      {formatDistanceToNow(new Date(config.last_failure_at), { addSuffix: true })}
                    </>
                  ) : 'None'}
                </span>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-2xl font-bold">{todaySent}</div>
              <div className="text-xs text-muted-foreground">Sent Today</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-2xl font-bold text-destructive">{todayFailed}</div>
              <div className="text-xs text-muted-foreground">Failed Today</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!config ? (
              <Button onClick={() => setShowConnectDialog(true)}>
                <Wifi className="w-4 h-4 mr-1" /> Connect Slack
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => { setWebhookUrl(''); setShowConnectDialog(true); }}>
                  Update Webhook
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendTest('test')}
                  disabled={sendingTest === 'test'}
                >
                  {sendingTest === 'test' ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  Send Test
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowDisconnectDialog(true)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Disconnect
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Categories & History */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="categories" className="flex-1 gap-1.5">
            <Settings2 className="w-4 h-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1.5">
            <History className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-3 mt-4">
          {preferences.map(pref => {
            const catInfo = CATEGORY_LABELS[pref.category] || { label: pref.category, description: '', icon: '📌' };
            return (
              <Card key={pref.id} className={!pref.is_enabled ? 'opacity-60' : ''}>
                <CardContent className="py-4 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Category label & toggle */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch
                        checked={pref.is_enabled}
                        onCheckedChange={(checked) => handleToggleCategory(pref, checked)}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          <span>{catInfo.icon}</span>
                          <span className="truncate">{catInfo.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{catInfo.description}</div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={pref.severity} onValueChange={(val) => handleUpdateSeverity(pref, val)}>
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">ℹ️ Info</SelectItem>
                          <SelectItem value="warning">⚠️ Warning</SelectItem>
                          <SelectItem value="critical">🚨 Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={pref.frequency} onValueChange={(val) => handleUpdateFrequency(pref, val)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">⚡ Real-time</SelectItem>
                          <SelectItem value="batched_hourly">🕐 Hourly</SelectItem>
                          <SelectItem value="daily_digest">📋 Daily</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        disabled={!config || sendingTest === pref.category}
                        onClick={() => handleSendTest(pref.category)}
                      >
                        {sendingTest === pref.category ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No alerts sent yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(item.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {(CATEGORY_LABELS[item.category]?.icon || '📌') + ' '}
                            {CATEGORY_LABELS[item.category]?.label || item.category}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {item.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.severity === 'critical' ? 'destructive' : item.severity === 'warning' ? 'secondary' : 'outline'} className="text-xs">
                              {item.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.delivery_status === 'delivered' ? (
                              <Badge variant="default" className="bg-green-600 text-xs">Sent</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Failed</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config ? 'Update Webhook' : 'Connect Slack'}</DialogTitle>
            <DialogDescription>
              Enter your Slack Incoming Webhook URL. You can create one at{' '}
              <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener" className="text-primary underline">
                api.slack.com/messaging/webhooks
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Webhook URL</Label>
            <Input
              type="url"
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={saving || !webhookUrl.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {config ? 'Update' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Slack?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all Slack alerts. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
