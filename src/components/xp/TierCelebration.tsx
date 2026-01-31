import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { getTierDisplayName, getTierGradient, getTierColorClass } from '@/utils/performanceScoring';
import { Trophy, Star, TrendingUp, Flame, Zap, Award } from 'lucide-react';
import type { PerformanceTier } from '@/types/xp';

interface TierCelebrationProps {
  tier: PerformanceTier;
  performanceScore: number;
  onComplete: () => void;
}

const TIER_ICONS: Record<PerformanceTier, React.ReactNode> = {
  struggling: <TrendingUp className="w-12 h-12" />,
  developing: <Zap className="w-12 h-12" />,
  solid: <Award className="w-12 h-12" />,
  great: <Star className="w-12 h-12" />,
  elite: <Trophy className="w-12 h-12" />,
  legendary: <Flame className="w-12 h-12" />,
};

const TIER_MESSAGES: Record<PerformanceTier, { title: string; subtitle: string }> = {
  struggling: {
    title: 'Keep Grinding!',
    subtitle: 'Every player starts somewhere. Your first milestone!',
  },
  developing: {
    title: 'Rising Star!',
    subtitle: 'You\'re showing real improvement. Keep it up!',
  },
  solid: {
    title: 'Consistent Performer!',
    subtitle: 'You\'re becoming a reliable force on the court.',
  },
  great: {
    title: 'Baller Mode Activated!',
    subtitle: 'You\'re playing at an impressive level!',
  },
  elite: {
    title: 'Elite Status Unlocked!',
    subtitle: 'You\'re among the best. Dominating the game!',
  },
  legendary: {
    title: 'LEGENDARY PERFORMANCE!',
    subtitle: 'Hall of Fame material. Absolutely unstoppable!',
  },
};

export function TierCelebration({ tier, performanceScore, onComplete }: TierCelebrationProps) {
  const [stage, setStage] = useState<'intro' | 'reveal' | 'message'>('intro');
  const gradient = getTierGradient(tier);
  const tierName = getTierDisplayName(tier);
  const tierMessage = TIER_MESSAGES[tier];
  const tierIcon = TIER_ICONS[tier];

  // Trigger confetti based on tier
  useEffect(() => {
    const tierConfettiConfig = {
      struggling: { count: 30, spread: 50 },
      developing: { count: 50, spread: 60 },
      solid: { count: 80, spread: 70 },
      great: { count: 100, spread: 80 },
      elite: { count: 150, spread: 100 },
      legendary: { count: 200, spread: 120 },
    };

    const config = tierConfettiConfig[tier];
    
    // Burst from center
    confetti({
      particleCount: config.count,
      spread: config.spread,
      origin: { y: 0.6 },
      colors: getTierConfettiColors(tier),
    });

    // For elite and legendary, add side bursts
    if (tier === 'elite' || tier === 'legendary') {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: getTierConfettiColors(tier),
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: getTierConfettiColors(tier),
        });
      }, 300);
    }
  }, [tier]);

  // Stage transitions
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setStage('reveal'), 500));
    timers.push(setTimeout(() => setStage('message'), 2000));
    timers.push(setTimeout(onComplete, 5000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div
            key="intro"
            className="text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 12 }}
          >
            <motion.p 
              className="text-2xl font-bold text-white/80"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              NEW TIER UNLOCKED!
            </motion.p>
          </motion.div>
        )}

        {stage === 'reveal' && (
          <motion.div
            key="reveal"
            className="text-center space-y-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            {/* Tier Icon with Glow */}
            <motion.div
              className={cn(
                'mx-auto w-24 h-24 rounded-full flex items-center justify-center',
                'bg-gradient-to-br text-white',
                gradient
              )}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255,255,255,0.3)',
                  '0 0 60px rgba(255,255,255,0.6)',
                  '0 0 20px rgba(255,255,255,0.3)',
                ],
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {tierIcon}
            </motion.div>

            {/* Tier Name */}
            <motion.h2
              className={cn(
                'text-5xl font-black bg-gradient-to-r bg-clip-text text-transparent',
                gradient
              )}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {tierName}
            </motion.h2>

            {/* Score */}
            <motion.p
              className="text-xl text-white/70"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Performance Score: <span className="font-bold text-white">{performanceScore.toFixed(1)}</span>
            </motion.p>
          </motion.div>
        )}

        {stage === 'message' && (
          <motion.div
            key="message"
            className="text-center space-y-4 max-w-md px-6"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
          >
            {/* Icon */}
            <motion.div
              className={cn(
                'mx-auto w-20 h-20 rounded-full flex items-center justify-center',
                'bg-gradient-to-br text-white',
                gradient
              )}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {tierIcon}
            </motion.div>

            {/* Title */}
            <motion.h3
              className={cn(
                'text-3xl font-black bg-gradient-to-r bg-clip-text text-transparent',
                gradient
              )}
            >
              {tierMessage.title}
            </motion.h3>

            {/* Subtitle */}
            <motion.p className="text-lg text-white/70">
              {tierMessage.subtitle}
            </motion.p>

            {/* First Time Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">First {tierName} Performance!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        className="absolute bottom-10 text-white/50 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Tap anywhere to continue
      </motion.p>
    </motion.div>
  );
}

function getTierConfettiColors(tier: PerformanceTier): string[] {
  switch (tier) {
    case 'legendary':
      return ['#FFD700', '#FFA500', '#FF6347', '#FF4500'];
    case 'elite':
      return ['#A855F7', '#EC4899', '#8B5CF6', '#D946EF'];
    case 'great':
      return ['#3B82F6', '#06B6D4', '#0EA5E9', '#22D3EE'];
    case 'solid':
      return ['#22C55E', '#10B981', '#34D399', '#4ADE80'];
    case 'developing':
      return ['#F97316', '#FBBF24', '#FB923C', '#FCD34D'];
    case 'struggling':
      return ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
  }
}
