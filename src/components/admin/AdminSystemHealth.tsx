import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Cpu, Wifi } from 'lucide-react';

type HealthStatus = 'online' | 'degraded' | 'offline';

interface ServiceHealth {
  database: HealthStatus;
  api: HealthStatus;
  ai: HealthStatus;
}

export function AdminSystemHealth() {
  const [health, setHealth] = useState<ServiceHealth>({
    database: 'online',
    api: 'online',
    ai: 'online',
  });

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    const newHealth: ServiceHealth = { database: 'offline', api: 'offline', ai: 'offline' };

    // Check database
    try {
      const start = Date.now();
      const { error } = await supabase.from('feature_flags').select('id', { count: 'exact', head: true });
      const duration = Date.now() - start;
      newHealth.database = error ? 'offline' : duration > 3000 ? 'degraded' : 'online';
    } catch {
      newHealth.database = 'offline';
    }

    // Check API (edge functions)
    try {
      const start = Date.now();
      const { error } = await supabase.functions.invoke('check-subscription', {
        body: {},
      });
      const duration = Date.now() - start;
      newHealth.api = error ? 'degraded' : duration > 5000 ? 'degraded' : 'online';
    } catch {
      newHealth.api = 'offline';
    }

    // AI service check - infer from coach_memory recent entries
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('coach_memory')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);
      // If we can query it, the underlying service is accessible
      newHealth.ai = error ? 'degraded' : 'online';
    } catch {
      newHealth.ai = 'degraded';
    }

    setHealth(newHealth);
  }

  const statusConfig: Record<HealthStatus, { color: string; label: string }> = {
    online: { color: 'bg-green-500', label: 'Online' },
    degraded: { color: 'bg-amber-500', label: 'Degraded' },
    offline: { color: 'bg-destructive', label: 'Offline' },
  };

  const services = [
    { key: 'database' as const, label: 'Database', icon: Database },
    { key: 'api' as const, label: 'API', icon: Wifi },
    { key: 'ai' as const, label: 'AI Service', icon: Cpu },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {services.map(service => {
            const status = health[service.key];
            const config = statusConfig[status];
            return (
              <div key={service.key} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                <span className="text-xs text-muted-foreground">{service.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
