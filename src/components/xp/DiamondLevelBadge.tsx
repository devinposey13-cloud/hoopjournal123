import { cn } from '@/lib/utils';
import { getLevelTierGradient, getLevelTierColor } from '@/utils/xpCalculations';

interface DiamondLevelBadgeProps {
  level: number;
  progressPercent?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DiamondLevelBadge({ level, progressPercent = 0, size = 'md', className }: DiamondLevelBadgeProps) {
  const gradient = getLevelTierGradient(level);
  const tierColor = getLevelTierColor(level);
  const isCloseToLevelUp = progressPercent >= 75;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Glow effect when close to leveling up */}
      {isCloseToLevelUp && (
        <div
          className={cn(
            'absolute rotate-45 rounded-sm animate-pulse',
            'bg-gradient-to-br blur-md opacity-60',
            gradient,
            size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'
          )}
        />
      )}
      
      {/* Diamond shape container */}
      <div
        className={cn(
          'relative rotate-45 rounded-sm shadow-lg',
          'bg-gradient-to-br',
          gradient,
          sizeClasses[size],
          level >= 45 && 'animate-pulse',
          isCloseToLevelUp && 'ring-2 ring-primary/50'
        )}
      >
        {/* Inner diamond with background */}
        <div className="absolute inset-[2px] rounded-sm bg-background/90 flex items-center justify-center">
          {/* Level number - counter-rotate to appear upright */}
          <span className={cn('font-bold -rotate-45', tierColor)}>
            {level}
          </span>
        </div>
        
        {/* Glow effect for high levels */}
        {level >= 35 && (
          <div
            className={cn(
              'absolute inset-0 rounded-sm blur-sm opacity-50',
              'bg-gradient-to-br',
              gradient
            )}
          />
        )}
      </div>
    </div>
  );
}
