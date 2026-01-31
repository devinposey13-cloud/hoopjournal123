import { cn } from '@/lib/utils';
import { getLevelTier, getLevelTierColor, getLevelTierGradient } from '@/utils/xpCalculations';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showTier?: boolean;
  className?: string;
}

export function LevelBadge({ level, size = 'md', showTier = false, className }: LevelBadgeProps) {
  const tier = getLevelTier(level);
  const tierColor = getLevelTierColor(level);
  const gradient = getLevelTierGradient(level);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full font-bold',
          'bg-gradient-to-br shadow-lg',
          gradient,
          sizeClasses[size],
          level >= 45 && 'animate-pulse'
        )}
      >
        {/* Inner circle */}
        <div className="absolute inset-[2px] rounded-full bg-background/90 flex items-center justify-center">
          <span className={cn('font-bold', tierColor)}>{level}</span>
        </div>
        
        {/* Glow effect for high levels */}
        {level >= 35 && (
          <div
            className={cn(
              'absolute inset-0 rounded-full blur-sm opacity-50',
              'bg-gradient-to-br',
              gradient
            )}
          />
        )}
      </div>
      
      {showTier && (
        <div className="flex flex-col">
          <span className={cn('text-xs font-medium', tierColor)}>{tier}</span>
          <span className="text-xs text-muted-foreground">Level {level}</span>
        </div>
      )}
    </div>
  );
}
