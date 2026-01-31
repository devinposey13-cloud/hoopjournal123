import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getLevelTierGradient, getXpProgressInLevel, formatXp } from '@/utils/xpCalculations';

interface XpProgressBarProps {
  currentXp: number;
  level: number;
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

export function XpProgressBar({ 
  currentXp, 
  level, 
  showLabel = true, 
  animate = true,
  className 
}: XpProgressBarProps) {
  const { current, required, percent } = getXpProgressInLevel(currentXp);
  const gradient = getLevelTierGradient(level);

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Level {level}</span>
          <span>
            {formatXp(current)} / {formatXp(required)} XP
          </span>
        </div>
      )}
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', gradient)}
          initial={animate ? { width: 0 } : { width: `${percent}%` }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ left: '-80px' }}
          animate={{ left: '100%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'linear',
          }}
        />
      </div>
    </div>
  );
}
