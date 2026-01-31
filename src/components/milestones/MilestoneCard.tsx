import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, Star, Crown, Shield, Hand, Users, Flame, ArrowUp, 
  Circle, Crosshair, Zap, Send, Box, Eye, ShieldOff, TrendingUp,
  Trophy, Medal, Play, RotateCw, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MilestoneDefinition, MilestoneRarity, MilestoneStatsSnapshot, PlayerMilestone } from '@/types/milestone';
import { format } from 'date-fns';
import { MilestoneCardBack } from './MilestoneCardBack';

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
  gameOpponent?: string; // Override opponent from actual game data
  isEarned?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  className?: string;
  // New props for flip-card functionality
  allOccurrences?: PlayerMilestone[];
  gamesMap?: Map<string, { opponent: string }>;
  showFlipHint?: boolean;
  occurrenceCount?: number;
}

export const MilestoneCard = forwardRef<HTMLDivElement, MilestoneCardProps>(({
  milestone,
  earnedAt,
  statsSnapshot,
  gameOpponent,
  isEarned = true,
  isLocked = false,
  onClick,
  className,
  allOccurrences = [],
  gamesMap,
  showFlipHint = false,
  occurrenceCount,
}, ref) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Use gameOpponent if provided (from actual game data), otherwise fall back to snapshot
  const displayOpponent = gameOpponent || statsSnapshot?.opponent;
  const IconComponent = ICON_MAP[milestone.icon] || Star;
  const rarity = RARITY_CONFIG[milestone.rarity];
  
  // Calculate display count
  const count = occurrenceCount ?? allOccurrences.length;
  const hasMultipleOccurrences = count > 1;
  const canFlip = isEarned && allOccurrences.length > 0;

  const handleClick = () => {
    if (canFlip && !isLocked) {
      setIsFlipped(!isFlipped);
    }
    onClick?.();
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative h-[200px]',
        'cursor-pointer',
        className
      )}
      style={{ perspective: '1000px' }}
      onClick={handleClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {/* FRONT SIDE */}
        <div
          className={cn(
            'absolute inset-0 overflow-hidden rounded-xl transition-all duration-300',
            'border bg-card',
            isEarned ? rarity.border : 'border-border/30',
            isEarned ? rarity.glow : '',
            isLocked && 'opacity-40 grayscale',
            !isLocked && !isFlipped && 'hover:scale-[1.02] hover:border-primary/50',
          )}
          style={{ backfaceVisibility: 'hidden' }}
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

          <div className="relative p-4 flex flex-col items-center text-center h-full">
            {/* Occurrence count badge */}
            {hasMultipleOccurrences && isEarned && (
              <div className={cn(
                'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold',
                'bg-primary/20 text-primary border border-primary/30'
              )}>
                {count}×
              </div>
            )}
            
            {/* Flip hint */}
            {showFlipHint && canFlip && !isFlipped && (
              <div className="absolute top-2 left-2">
                <RotateCw className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
              </div>
            )}

            {/* Rarity label */}
            <div className={cn(
              'absolute top-2 right-2 text-[10px] font-bold tracking-wider',
              rarity.text
            )}>
              {rarity.label}
            </div>

            {/* Icon */}
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center mb-2',
              isEarned 
                ? `bg-gradient-to-br ${rarity.gradient}` 
                : 'bg-muted'
            )}>
              <IconComponent className={cn(
                'w-7 h-7',
                isEarned ? 'text-white' : 'text-muted-foreground'
              )} />
            </div>

            {/* Name */}
            <h3 className={cn(
              'font-bold text-base mb-1 line-clamp-1',
              isEarned ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {milestone.name}
            </h3>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2 flex-1">
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
                {displayOpponent && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    vs {displayOpponent}
                  </div>
                )}
                {earnedAt && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(earnedAt), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            )}

            {/* Locked overlay */}
            {isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
                <div className="text-xs font-medium text-muted-foreground">
                  Not yet earned
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BACK SIDE */}
        {canFlip && (
          <MilestoneCardBack
            milestoneName={milestone.name}
            rarity={milestone.rarity}
            occurrences={allOccurrences}
            gamesMap={gamesMap}
            onFlipBack={() => setIsFlipped(false)}
          />
        )}
      </motion.div>
    </div>
  );
});
MilestoneCard.displayName = 'MilestoneCard';

// Mini version for compact displays (no flip functionality)
interface MilestoneCardMiniProps {
  milestone: MilestoneDefinition;
  isEarned?: boolean;
  occurrenceCount?: number;
}

export function MilestoneCardMini({ milestone, isEarned = true, occurrenceCount }: MilestoneCardMiniProps) {
  const IconComponent = ICON_MAP[milestone.icon] || Star;
  const rarity = RARITY_CONFIG[milestone.rarity];
  const hasMultiple = (occurrenceCount ?? 0) > 1;

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg border relative',
      isEarned ? rarity.border : 'border-border/30',
      isEarned ? 'bg-card' : 'bg-muted/20 opacity-60'
    )}>
      {/* Count badge */}
      {hasMultiple && isEarned && (
        <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary text-primary-foreground">
          {occurrenceCount}×
        </div>
      )}
      
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
