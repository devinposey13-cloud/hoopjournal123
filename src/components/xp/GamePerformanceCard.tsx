import { motion } from 'framer-motion';
import { TrendingUp, Zap, Award, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  calculatePerformance, 
  getTierDisplayName, 
  getTierColorClass, 
  getTierGradient,
  PERFORMANCE_TIERS,
} from '@/utils/performanceScoring';
import { PerformanceBreakdown } from './PerformanceBreakdown';
import type { GameStats } from '@/types/basketball';
import type { PerformanceTier } from '@/types/xp';

interface GamePerformanceCardProps {
  game: GameStats;
  className?: string;
}

// Get the next tier and progress toward it
function getTierProgress(score: number, currentTier: PerformanceTier): {
  nextTier: PerformanceTier | null;
  progress: number;
  pointsToNext: number;
  currentTierMin: number;
  nextTierMin: number;
} {
  const tierOrder: PerformanceTier[] = ['starter', 'rising', 'solid', 'great', 'elite', 'legendary'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentTier === 'legendary') {
    return { nextTier: null, progress: 100, pointsToNext: 0, currentTierMin: 101, nextTierMin: 101 };
  }
  
  const nextTier = tierOrder[currentIndex + 1];
  const currentTierMin = PERFORMANCE_TIERS[currentTier].min;
  const nextTierMin = PERFORMANCE_TIERS[nextTier].min;
  const tierRange = nextTierMin - currentTierMin;
  const progressInTier = score - currentTierMin;
  const progress = Math.min(100, (progressInTier / tierRange) * 100);
  const pointsToNext = Math.max(0, nextTierMin - score);
  
  return { nextTier, progress, pointsToNext, currentTierMin, nextTierMin };
}

export function GamePerformanceCard({ game, className }: GamePerformanceCardProps) {
  const performance = calculatePerformance(game);
  const tierName = getTierDisplayName(performance.tier);
  const tierColor = getTierColorClass(performance.tier);
  const tierGradient = getTierGradient(performance.tier);
  
  const tierProgress = getTierProgress(performance.finalScore, performance.tier);
  const nextTierName = tierProgress.nextTier ? getTierDisplayName(tierProgress.nextTier) : null;
  const nextTierGradient = tierProgress.nextTier ? getTierGradient(tierProgress.nextTier) : '';

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Performance Score
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Score Display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <motion.p
              className="text-4xl font-bold"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {performance.finalScore.toFixed(1)}
            </motion.p>
            <p className="text-sm text-muted-foreground">
              Raw: {performance.rawScore.toFixed(1)} × {performance.multiplier.toFixed(2)}
            </p>
          </div>
          
          {/* Tier Badge */}
          <motion.div
            className={cn(
              'px-4 py-2 rounded-full bg-gradient-to-r text-white font-bold',
              tierGradient
            )}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              {tierName}
            </span>
          </motion.div>
        </div>

        {/* Tier Progress Indicator */}
        {tierProgress.nextTier && (
          <motion.div
            className="space-y-2"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className={cn('font-medium', tierColor)}>{tierName}</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>{tierProgress.pointsToNext.toFixed(1)} pts to</span>
                <ChevronRight className="w-3 h-3" />
                <span className={cn('font-medium', getTierColorClass(tierProgress.nextTier))}>
                  {nextTierName}
                </span>
              </div>
            </div>
            
            <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
              {/* Current tier progress */}
              <motion.div
                className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', tierGradient)}
                initial={{ width: 0 }}
                animate={{ width: `${tierProgress.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
              
              {/* Next tier indicator (ghost) */}
              <div 
                className={cn(
                  'absolute inset-y-0 right-0 w-2 rounded-r-full bg-gradient-to-r opacity-30',
                  nextTierGradient
                )}
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              {tierProgress.progress.toFixed(0)}% through {tierName} tier
            </p>
          </motion.div>
        )}
        
        {/* Legendary tier - max achieved */}
        {!tierProgress.nextTier && (
          <motion.div
            className="text-center p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <p className="text-sm font-semibold text-yellow-400">🏆 Maximum Tier Achieved!</p>
          </motion.div>
        )}

        {/* XP Earned */}
        <motion.div
          className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Zap className="w-6 h-6 text-primary" />
          <div>
            <p className="font-semibold text-primary">+{performance.xpEarned} XP</p>
            <p className="text-xs text-muted-foreground">Earned from this game</p>
          </div>
        </motion.div>

        {/* Bonuses */}
        {performance.bonuses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Efficiency Bonuses
            </h4>
            <div className="flex flex-wrap gap-2">
              {performance.bonuses.map((bonus, index) => (
                <motion.span
                  key={bonus}
                  className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-500"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  ✓ {bonus}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Performance Breakdown */}
        <PerformanceBreakdown breakdown={performance.breakdown} />
      </CardContent>
    </Card>
  );
}