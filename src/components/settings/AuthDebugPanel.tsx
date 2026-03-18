import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { isNativeApp, getPlatform } from '@/lib/platform';
import { Shield, Clock, User, Smartphone } from 'lucide-react';

interface SessionInfo {
  provider: string;
  email: string | null;
  userId: string | null;
  expiresAt: string | null;
  expiresIn: string;
  status: 'active' | 'expired' | 'none';
  platform: string;
  isNative: boolean;
}

export function AuthDebugPanel() {
  const [info, setInfo] = useState<SessionInfo | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setInfo({
          provider: 'none',
          email: null,
          userId: null,
          expiresAt: null,
          expiresIn: 'N/A',
          status: 'none',
          platform: getPlatform(),
          isNative: isNativeApp(),
        });
        return;
      }

      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      const isExpired = expiresAt ? expiresAt < now : false;
      const diffMs = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);

      let expiresIn = 'N/A';
      if (expiresAt) {
        if (isExpired) {
          expiresIn = 'Expired';
        } else if (diffHr > 0) {
          expiresIn = `${diffHr}h ${diffMin % 60}m`;
        } else {
          expiresIn = `${diffMin}m`;
        }
      }

      setInfo({
        provider: session.user?.app_metadata?.provider || 'email',
        email: session.user?.email || null,
        userId: session.user?.id || null,
        expiresAt: expiresAt?.toLocaleString() || null,
        expiresIn,
        status: isExpired ? 'expired' : 'active',
        platform: getPlatform(),
        isNative: isNativeApp(),
      });
    };

    refresh();
    const interval = setInterval(refresh, 30000);

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      clearInterval(interval);
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!info) return null;

  const statusColor = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
    none: 'bg-muted text-muted-foreground border-border',
  }[info.status];

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Shield className="w-4 h-4 text-primary" />
        Auth Debug
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <User className="w-3 h-3" />
          Provider
        </div>
        <div className="text-foreground font-mono">{info.provider}</div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          Token Expires
        </div>
        <div className="text-foreground font-mono">{info.expiresIn}</div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Shield className="w-3 h-3" />
          Session
        </div>
        <Badge variant="outline" className={`text-[10px] w-fit ${statusColor}`}>
          {info.status.toUpperCase()}
        </Badge>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Smartphone className="w-3 h-3" />
          Platform
        </div>
        <div className="text-foreground font-mono">
          {info.platform} {info.isNative ? '(native)' : '(web)'}
        </div>
      </div>

      {info.email && (
        <p className="text-[10px] text-muted-foreground truncate">
          {info.email} • {info.userId?.substring(0, 8)}...
        </p>
      )}

      {info.expiresAt && (
        <p className="text-[10px] text-muted-foreground">
          Expires: {info.expiresAt}
        </p>
      )}
    </div>
  );
}
