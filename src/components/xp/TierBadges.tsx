import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Crown, Gem, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierBadgesProps {
  achievedTiers: Array<{ tier: string }>;
  size?: 'sm' | 'md';
  className?: string;
}

const tierConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  'struggling': { icon: Trophy, color: 'text-slate-500', bgColor: 'bg-slate-500/20', label: 'Struggling' },
  'developing': { icon: Trophy, color: 'text-orange-600', bgColor: 'bg-orange-500/20', label: 'Developing' },
  'solid': { icon: Star, color: 'text-green-500', bgColor: 'bg-green-500/20', label: 'Solid' },
  'great': { icon: Star, color: 'text-blue-500', bgColor: 'bg-blue-500/20', label: 'Great' },
  'elite': { icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-500/20', label: 'Elite' },
  'legendary': { icon: Flame, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', label: 'Legendary' },
};

// Order tiers from highest to lowest
const tierOrder = ['legendary', 'elite', 'great', 'solid', 'developing', 'struggling'];

export function TierBadges({ achievedTiers, size = 'md', className }: TierBadgesProps) {
  // Count occurrences of each tier
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    achievedTiers.forEach(t => {
      counts[t.tier] = (counts[t.tier] || 0) + 1;
    });
    return counts;
  }, [achievedTiers]);

  if (Object.keys(tierCounts).length === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tierOrder
        .filter(tier => tierCounts[tier])
        .map(tier => {
          const count = tierCounts[tier];
          const config = tierConfig[tier];
          if (!config) return null;
          const Icon = config.icon;
          
          return (
            <Badge
              key={tier}
              variant="outline"
              className={cn(
                'flex items-center font-semibold',
                sizeClasses[size],
                config.bgColor,
                config.color,
                'border-current/30'
              )}
            >
              <Icon className={iconSizes[size]} />
              {config.label}
              {count > 1 && (
                <span className="ml-1 opacity-80">×{count}</span>
              )}
            </Badge>
          );
        })}
    </div>
  );
}
