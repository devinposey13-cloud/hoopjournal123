import { 
  Flame, Target, Zap, Crosshair, Star, Users, Crown, Move, 
  Shield, ShieldCheck, Hand, ArrowUp, Square, Repeat 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EarnedBadge, BadgeTier } from '@/types/tradingCard';
import { TIER_COLORS } from '@/types/tradingCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BadgeDisplayProps {
  badge: EarnedBadge;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  target: Target,
  zap: Zap,
  crosshair: Crosshair,
  star: Star,
  users: Users,
  crown: Crown,
  move: Move,
  shield: Shield,
  'shield-check': ShieldCheck,
  hand: Hand,
  'arrow-up': ArrowUp,
  square: Square,
  repeat: Repeat,
};

const TIER_LABELS: Record<BadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  hof: 'HOF',
};

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

const ICON_SIZE_CLASSES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function BadgeDisplay({ badge, size = 'md', showTooltip = true }: BadgeDisplayProps) {
  const IconComponent = ICON_MAP[badge.icon] || Shield;
  const tierStyle = TIER_COLORS[badge.tier];

  const badgeElement = (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full border-2',
        SIZE_CLASSES[size],
        tierStyle.bg,
        tierStyle.text,
        tierStyle.border,
        badge.tier === 'hof' && 'animate-pulse shadow-lg shadow-purple-500/50',
        badge.tier === 'gold' && 'shadow-md shadow-yellow-500/30'
      )}
    >
      <IconComponent className={ICON_SIZE_CLASSES[size]} />
      {badge.tier === 'hof' && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 animate-pulse" />
      )}
    </div>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-bold px-1.5 py-0.5 rounded',
                tierStyle.bg,
                tierStyle.text
              )}>
                {TIER_LABELS[badge.tier]}
              </span>
              <span className="font-semibold">{badge.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface BadgeRowProps {
  badges: EarnedBadge[];
  maxBadges?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeRow({ badges, maxBadges = 5, size = 'md' }: BadgeRowProps) {
  const displayBadges = badges.slice(0, maxBadges);
  const remainingCount = badges.length - maxBadges;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {displayBadges.map((badge, index) => (
        <BadgeDisplay key={`${badge.name}-${index}`} badge={badge} size={size} />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}
