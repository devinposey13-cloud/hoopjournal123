import { useState, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MilestoneCard } from './MilestoneCard';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import type { MilestoneDefinition, MilestoneStatsSnapshot, MilestoneRarity } from '@/types/milestone';
import { cn } from '@/lib/utils';

interface MilestoneToReveal {
  milestone: MilestoneDefinition;
  statsSnapshot: MilestoneStatsSnapshot;
  gameId?: string;
}

interface MilestoneRevealProps {
  milestones: MilestoneToReveal[];
  onComplete: () => void;
  onViewCollection?: () => void;
}

// Confetti particle component
const Confetti = forwardRef<HTMLDivElement, { rarity: MilestoneRarity }>(({ rarity }, ref) => {
  const colors = {
    common: ['#64748b', '#94a3b8'],
    uncommon: ['#22c55e', '#10b981'],
    rare: ['#f59e0b', '#eab308'],
    epic: ['#a855f7', '#8b5cf6'],
    legendary: ['#f97316', '#ec4899', '#a855f7'],
  };

  const particleColors = colors[rarity];
  const particleCount = rarity === 'legendary' ? 40 : rarity === 'epic' ? 30 : 20;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: particleColors[i % particleColors.length],
            left: '50%',
            top: '50%',
          }}
          initial={{ 
            scale: 0,
            x: 0,
            y: 0,
          }}
          animate={{ 
            scale: [0, 1, 0],
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            rotate: Math.random() * 720,
          }}
          transition={{ 
            duration: 1.5,
            delay: 0.3 + Math.random() * 0.3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
});
Confetti.displayName = 'Confetti';

// Glow effect component
const GlowEffect = forwardRef<HTMLDivElement, { rarity: MilestoneRarity }>(({ rarity }, ref) => {
  const glowColors = {
    common: 'rgba(100, 116, 139, 0.3)',
    uncommon: 'rgba(34, 197, 94, 0.4)',
    rare: 'rgba(245, 158, 11, 0.5)',
    epic: 'rgba(168, 85, 247, 0.6)',
    legendary: 'rgba(249, 115, 22, 0.7)',
  };

  return (
    <motion.div
      ref={ref}
      className="absolute inset-0 rounded-xl"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0, 1, 0.5, 1],
        scale: [0.8, 1.1, 1],
      }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{
        background: `radial-gradient(circle, ${glowColors[rarity]} 0%, transparent 70%)`,
      }}
    />
  );
});
GlowEffect.displayName = 'GlowEffect';

export function MilestoneReveal({ milestones, onComplete, onViewCollection }: MilestoneRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const { playSound } = useSoundEffects();

  const currentMilestone = milestones[currentIndex];
  const hasMore = currentIndex < milestones.length - 1;

  // Play sound when card is revealed
  const playCelebrationSound = useCallback((rarity: MilestoneRarity) => {
    const soundMap: Record<MilestoneRarity, 'milestone_common' | 'milestone_uncommon' | 'milestone_rare' | 'milestone_epic' | 'milestone_legendary'> = {
      common: 'milestone_common',
      uncommon: 'milestone_uncommon',
      rare: 'milestone_rare',
      epic: 'milestone_epic',
      legendary: 'milestone_legendary',
    };
    playSound(soundMap[rarity]);
  }, [playSound]);

  // Start reveal animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
      // Play sound when card flips
      if (currentMilestone) {
        playCelebrationSound(currentMilestone.milestone.rarity);
      }
    }, 500);

    const cardTimer = setTimeout(() => {
      setShowCard(true);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(cardTimer);
    };
  }, [currentIndex, currentMilestone, playCelebrationSound]);

  const handleNext = useCallback(() => {
    if (hasMore) {
      setIsRevealed(false);
      setShowCard(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 300);
    } else {
      onComplete();
    }
  }, [hasMore, onComplete]);

  if (!currentMilestone) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-lg"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10"
        onClick={onComplete}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Progress indicator */}
      {milestones.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
          {milestones.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === currentIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      )}

      <div className="relative">
        {/* Glow effect */}
        <AnimatePresence>
          {isRevealed && (
            <GlowEffect rarity={currentMilestone.milestone.rarity} />
          )}
        </AnimatePresence>

        {/* Confetti */}
        <AnimatePresence>
          {isRevealed && currentMilestone.milestone.rarity !== 'common' && (
            <Confetti rarity={currentMilestone.milestone.rarity} />
          )}
        </AnimatePresence>

        {/* Card back / front */}
        <div className="relative perspective-1000">
          <AnimatePresence mode="wait">
            {!isRevealed ? (
              // Card back
              <motion.div
                key="back"
                initial={{ rotateY: 0, scale: 0.8, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-72 h-96 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/50 flex items-center justify-center cursor-pointer"
                onClick={() => setIsRevealed(true)}
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-center"
                >
                  <div className="text-6xl mb-4">🏀</div>
                  <p className="text-lg font-medium text-primary">
                    Tap to reveal!
                  </p>
                </motion.div>
              </motion.div>
            ) : (
              // Card front
              <motion.div
                key="front"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-72"
              >
                {showCard && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <MilestoneCard
                      milestone={currentMilestone.milestone}
                      earnedAt={new Date().toISOString()}
                      statsSnapshot={currentMilestone.statsSnapshot}
                      isEarned={true}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex flex-col gap-2"
            >
              <Button onClick={handleNext} className="w-full">
                {hasMore ? (
                  <>
                    Next Milestone
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  'Awesome!'
                )}
              </Button>
              {onViewCollection && !hasMore && (
                <Button variant="outline" onClick={onViewCollection} className="w-full">
                  View Collection
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
