import { 
  Target, Star, Crown, Shield, Hand, Users, Flame, ArrowUp, 
  Circle, Crosshair, Zap, Send, Box, Eye, ShieldOff, TrendingUp,
  Trophy, Medal, Play, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MilestoneDefinition, MilestoneRarity, MilestoneStatsSnapshot, RARITY_STYLES } from '@/types/milestone';
import { format } from 'date-fns';

const ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  star: Star,
  crown: Crown,
  shield: Shield,
  hand: Hand,
  users: Users,
  flame: Flame,
  'arrow-up': ArrowUp,
  circle: Circle,
  crosshair: Crosshair,
  zap: Zap,
  send: Send,
  box: Box,
  eye: Eye,
  'shield-off': ShieldOff,
  'trending-up': TrendingUp,
  trophy: Trophy,
  medal: Medal,
  play: Play,
};

const RARITY_CONFIG: Record<MilestoneRarity, {
  gradient: string;
  border: string;
  glow: string;
  text: string;
  label: string;
}> = {
  common: {
    gradient: 'from-slate-500 to-slate-700',
    border: 'border-slate-400/50',
    glow: '',
    text: 'text-slate-300',
    label: 'COMMON',
  },
  uncommon: {
    gradient: 'from-green-500 to-emerald-700',
    border: 'border-green-400/50',
    glow: 'shadow-lg shadow-green-500/20',
    text: 'text-green-400',
    label: 'UNCOMMON',
  },
  rare: {
    gradient: 'from-amber-400 to-yellow-600',
    border: 'border-amber-400/60',
    glow: 'shadow-lg shadow-amber-500/30',
    text: 'text-amber-400',
    label: 'RARE',
  },
  epic: {
    gradient: 'from-purple-500 to-violet-700',
    border: 'border-purple-400/60',
    glow: 'shadow-lg shadow-purple-500/40',
    text: 'text-purple-400',
    label: 'EPIC',
  },
  legendary: {
    gradient: 'from-orange-400 via-pink-500 to-purple-600',
    border: 'border-orange-400/70',
    glow: 'shadow-xl shadow-orange-500/50',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500',
    label: 'LEGENDARY',
  },
};

interface MilestoneCardProps {
  milestone: MilestoneDefinition;
  earnedAt?: string;
  statsSnapshot?: MilestoneStatsSnapshot;
  isEarned?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MilestoneCard({
  milestone,
  earnedAt,
  statsSnapshot,
  isEarned = true,
  isLocked = false,
  onClick,
  className,
}: MilestoneCardProps) {
  const IconComponent = ICON_MAP[milestone.icon] || Star;
  const rarity = RARITY_CONFIG[milestone.rarity];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer',
        'border bg-card',
        isEarned ? rarity.border : 'border-border/30',
        isEarned ? rarity.glow : '',
        isLocked && 'opacity-40 grayscale',
        !isLocked && 'hover:scale-[1.02] hover:border-primary/50',
        className
      )}
    >
      {/* Gradient background for earned cards */}
      {isEarned && (
        <div 
          className={cn(
            'absolute inset-0 opacity-10 bg-gradient-to-br',
            rarity.gradient
          )} 
        />
      )}

      <div className="relative p-4 flex flex-col items-center text-center">
        {/* Rarity label */}
        <div className={cn(
          'absolute top-2 right-2 text-[10px] font-bold tracking-wider',
          rarity.text
        )}>
          {rarity.label}
        </div>

        {/* Icon */}
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-3',
          isEarned 
            ? `bg-gradient-to-br ${rarity.gradient}` 
            : 'bg-muted'
        )}>
          <IconComponent className={cn(
            'w-8 h-8',
            isEarned ? 'text-white' : 'text-muted-foreground'
          )} />
        </div>

        {/* Name */}
        <h3 className={cn(
          'font-bold text-lg mb-1',
          isEarned ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {milestone.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {milestone.description}
        </p>

        {/* Stats snapshot (if earned) */}
        {isEarned && statsSnapshot && (
          <div className="w-full pt-2 border-t border-border/50">
            {statsSnapshot.points !== undefined && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {statsSnapshot.points} PTS
                </span>
                {statsSnapshot.rebounds !== undefined && (
                  <span> • {statsSnapshot.rebounds} REB</span>
                )}
                {statsSnapshot.assists !== undefined && (
                  <span> • {statsSnapshot.assists} AST</span>
                )}
              </div>
            )}
            {statsSnapshot.opponent && (
              <div className="text-xs text-muted-foreground mt-1">
                vs {statsSnapshot.opponent}
              </div>
            )}
            {earnedAt && (
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(earnedAt), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        )}

        {/* Locked overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="text-xs font-medium text-muted-foreground">
              Not yet earned
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mini version for compact displays
interface MilestoneCardMiniProps {
  milestone: MilestoneDefinition;
  isEarned?: boolean;
}

export function MilestoneCardMini({ milestone, isEarned = true }: MilestoneCardMiniProps) {
  const IconComponent = ICON_MAP[milestone.icon] || Star;
  const rarity = RARITY_CONFIG[milestone.rarity];

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg border',
      isEarned ? rarity.border : 'border-border/30',
      isEarned ? 'bg-card' : 'bg-muted/20 opacity-60'
    )}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center',
        isEarned ? `bg-gradient-to-br ${rarity.gradient}` : 'bg-muted'
      )}>
        <IconComponent className={cn(
          'w-4 h-4',
          isEarned ? 'text-white' : 'text-muted-foreground'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-sm font-medium truncate',
          isEarned ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {milestone.name}
        </div>
        <div className={cn('text-[10px] font-bold', rarity.text)}>
          {rarity.label}
        </div>
      </div>
    </div>
  );
}
