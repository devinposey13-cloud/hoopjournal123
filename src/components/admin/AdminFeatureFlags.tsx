import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_label: string;
  is_enabled: boolean;
  description: string | null;
  updated_at: string;
}

export function AdminFeatureFlags() {
  const { session } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_label');
      if (error) throw error;
      setFlags((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(flag: FeatureFlag) {
    setToggling(flag.id);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          is_enabled: !flag.is_enabled,
          updated_by: session?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flag.id);
      if (error) throw error;
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f));
      toast.success(`${flag.flag_label} ${!flag.is_enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Error toggling flag:', err);
      toast.error('Failed to update feature flag');
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ToggleLeft className="w-4 h-4 text-primary" />
          Feature Flags
        </CardTitle>
        <CardDescription>Toggle major product features without deploying code</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flags.map(flag => (
          <div key={flag.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">{flag.flag_label}</Label>
                <Badge variant={flag.is_enabled ? 'default' : 'secondary'} className="text-[10px]">
                  {flag.is_enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
              {flag.description && (
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              )}
            </div>
            <Switch
              checked={flag.is_enabled}
              onCheckedChange={() => handleToggle(flag)}
              disabled={toggling === flag.id}
            />
          </div>
        ))}
        {flags.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No feature flags configured</p>
        )}
      </CardContent>
    </Card>
  );
}
