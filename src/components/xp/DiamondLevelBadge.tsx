import { cn } from '@/lib/utils';
import { getLevelTierGradient, getLevelTierColor } from '@/utils/xpCalculations';

interface DiamondLevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DiamondLevelBadge({ level, size = 'md', className }: DiamondLevelBadgeProps) {
  const gradient = getLevelTierGradient(level);
  const tierColor = getLevelTierColor(level);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Diamond shape container */}
      <div
        className={cn(
          'relative rotate-45 rounded-sm shadow-lg',
          'bg-gradient-to-br',
          gradient,
          sizeClasses[size],
          level >= 45 && 'animate-pulse'
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
