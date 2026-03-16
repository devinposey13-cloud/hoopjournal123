import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { dispatchSlackAlert } from '@/utils/slackAlerts';

interface Props {
  session: any;
}

const MODE_INFO: Record<string, { label: string; description: string; badge: string }> = {
  automatic: {
    label: 'Automatic Approval',
    description: 'All new users are instantly approved and can access the app immediately.',
    badge: '⚡ Auto',
  },
  manual: {
    label: 'Manual Approval',
    description: 'All new users must be manually approved by an admin before accessing the app.',
    badge: '👤 Manual',
  },
  conditional: {
    label: 'Conditional Approval',
    description: 'Standard users are auto-approved. Suspicious accounts (disposable emails, no email) are flagged for manual review.',
    badge: '🔍 Conditional',
  },
};

export function ApprovalModeSelector({ session }: Props) {
  const [mode, setMode] = useState<string>('automatic');
  const [flagId, setFlagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMode();
  }, []);

  async function fetchMode() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, flag_value')
        .eq('flag_key', 'user_approval_mode')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setMode(data.flag_value || 'automatic');
        setFlagId(data.id);
      }
    } catch (err) {
      console.error('Error fetching approval mode:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleModeChange(newMode: string) {
    if (!flagId || newMode === mode) return;
    setSaving(true);
    const oldMode = mode;
    setMode(newMode);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          flag_value: newMode,
          updated_by: session?.user?.id,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', flagId);
      if (error) throw error;
      toast.success(`Approval mode changed to ${MODE_INFO[newMode]?.label || newMode}`);
      dispatchSlackAlert({
        category: 'admin_audit',
        title: 'Approval Mode Changed',
        summary: `Admin changed approval mode from "${oldMode}" to "${newMode}".`,
        details: { 'Previous Mode': oldMode, 'New Mode': newMode },
        dedup_key: `approval_mode_${Date.now()}`,
      });
    } catch (err) {
      console.error('Error updating approval mode:', err);
      setMode(oldMode);
      toast.error('Failed to update approval mode');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentInfo = MODE_INFO[mode] || MODE_INFO.automatic;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          User Approval Mode
          <Badge variant="outline" className="ml-auto text-xs">
            {currentInfo.badge}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">{currentInfo.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Label className="text-sm shrink-0">Mode:</Label>
          <Select value={mode} onValueChange={handleModeChange} disabled={saving}>
            <SelectTrigger className="w-full max-w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automatic">⚡ Automatic Approval</SelectItem>
              <SelectItem value="manual">👤 Manual Approval</SelectItem>
              <SelectItem value="conditional">🔍 Conditional Approval</SelectItem>
            </SelectContent>
          </Select>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );
}
