import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Copy, RefreshCw, Check, Lock, ExternalLink, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { usePlan } from '@/hooks/usePlanState';
import { canUseFeature } from '@/lib/plans';
import { useActiveProfile } from '@/hooks/useActiveProfile';

export function ParentDashboardSettings() {
  const { currentPlan, openPaywall } = usePlan();
  const { activeProfile } = useActiveProfile();
  const hasAccess = canUseFeature(currentPlan, 'parentDashboard');

  const [isEnabled, setIsEnabled] = useState(false);
  const [tokenValue, setTokenValue] = useState<string | null>(null);
  const [lastViewed, setLastViewed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = tokenValue ? `${window.location.origin}/parent/${tokenValue}` : null;

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    fetchToken();
  }, [hasAccess, activeProfile?.id]);

  async function fetchToken() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('parent_dashboard_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      setIsEnabled(true);
      setTokenValue(data.token);
      setLastViewed(data.last_viewed_at);
    } else {
      setIsEnabled(false);
      setTokenValue(null);
    }
    setLoading(false);
  }

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setToggling(false); return; }

    if (enabled) {
      const newToken = crypto.randomUUID().replace(/-/g, '');
      const { error } = await supabase.from('parent_dashboard_tokens').insert({
        user_id: user.id,
        profile_id: activeProfile?.id || null,
        token: newToken,
      });

      if (error) {
        toast.error('Failed to enable parent dashboard');
      } else {
        setIsEnabled(true);
        setTokenValue(newToken);
        toast.success('Parent dashboard enabled!');
      }
    } else {
      // Deactivate all tokens
      const { error } = await supabase
        .from('parent_dashboard_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to disable');
      } else {
        setIsEnabled(false);
        setTokenValue(null);
        setLastViewed(null);
        toast.success('Parent dashboard disabled');
      }
    }
    setToggling(false);
  }

  async function handleRegenerate() {
    setToggling(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setToggling(false); return; }

    // Deactivate old
    await supabase
      .from('parent_dashboard_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Create new
    const newToken = crypto.randomUUID().replace(/-/g, '');
    const { error } = await supabase.from('parent_dashboard_tokens').insert({
      user_id: user.id,
      profile_id: activeProfile?.id || null,
      token: newToken,
    });

    if (error) {
      toast.error('Failed to regenerate link');
    } else {
      setTokenValue(newToken);
      setLastViewed(null);
      toast.success('New link generated! Old link no longer works.');
    }
    setToggling(false);
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  // Locked state for non-Elite users
  if (!hasAccess) {
    return (
      <>
        <Separator className="my-6" />
        <div className="stat-card p-4 rounded-lg space-y-3 border border-dashed border-muted-foreground/20 opacity-75">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Parent Dashboard
                <Badge variant="secondary" className="text-xs">Elite</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Share a read-only link so parents can follow your stats and progress.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openPaywall('parent_dashboard')}
          >
            <Lock className="w-4 h-4 mr-2" />
            Upgrade to Unlock
          </Button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Separator className="my-6" />
        <div className="stat-card p-4 rounded-lg space-y-3 animate-pulse">
          <div className="h-10 bg-muted rounded w-full" />
          <div className="h-8 bg-muted rounded w-3/4" />
        </div>
      </>
    );
  }

  return (
    <>
      <Separator className="my-6" />
      <div className="stat-card bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/20 p-4 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Parent Dashboard</h3>
              <p className="text-xs text-muted-foreground">
                Share a read-only link with your parents
              </p>
            </div>
          </div>
          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Elite</Badge>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-blue-500/10">
          <div className="flex-1">
            <Label htmlFor="parent-dashboard-toggle" className="text-sm font-medium cursor-pointer">
              Enable Parent Dashboard
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate a shareable link for parents to view your stats
            </p>
          </div>
          <Switch
            id="parent-dashboard-toggle"
            checked={isEnabled}
            disabled={toggling}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Link display */}
        {isEnabled && shareUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-background/50 border rounded-md px-3 py-2 text-muted-foreground font-mono truncate"
              />
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => window.open(shareUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={handleRegenerate}
                disabled={toggling}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${toggling ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>

            {lastViewed && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Last viewed: {new Date(lastViewed).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
