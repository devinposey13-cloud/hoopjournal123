import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Lock, Check } from 'lucide-react';
import type { LevelReward } from '@/types/xp';

interface LevelRewardCardProps {
  reward: LevelReward;
  isUnlocked: boolean;
  currentLevel: number;
  className?: string;
}

export function LevelRewardCard({ reward, isUnlocked, currentLevel, className }: LevelRewardCardProps) {
  const isReachable = currentLevel < reward.level_required;
  const levelsAway = reward.level_required - currentLevel;

  return (
    <motion.div
      className={cn(
        'relative rounded-xl border p-4 transition-all',
        isUnlocked 
          ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30' 
          : 'bg-card border-border',
        !isUnlocked && 'opacity-60',
        className
      )}
      whileHover={isUnlocked ? { scale: 1.02 } : undefined}
    >
      {/* Lock/Check Icon */}
      <div className={cn(
        'absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center',
        isUnlocked ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'
      )}>
        {isUnlocked ? <Check className="w-4 h-4" /> : <Lock className="w-3 h-3" />}
      </div>

      {/* Icon */}
      <div className="text-3xl mb-2">{reward.reward_icon}</div>

      {/* Info */}
      <div className="space-y-1">
        <h4 className="font-semibold">{reward.reward_name}</h4>
        <p className="text-sm text-muted-foreground">{reward.description}</p>
        
        {/* Level requirement */}
        <div className="flex items-center gap-2 mt-2">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isUnlocked ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
          )}>
            Level {reward.level_required}
          </span>
          
          {!isUnlocked && isReachable && (
            <span className="text-xs text-muted-foreground">
              {levelsAway} level{levelsAway !== 1 ? 's' : ''} away
            </span>
          )}
        </div>
      </div>

      {/* Shimmer effect for unlocked rewards */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
