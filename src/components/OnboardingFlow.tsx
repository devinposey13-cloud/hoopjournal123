import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ProgressDots } from './onboarding/ProgressDots';
import { IdentityCard } from './onboarding/IdentityCard';
import { PlayerIdentityCard } from './onboarding/PlayerIdentityCard';
import { GoalsCard } from './onboarding/GoalsCard';
import { CompletionCard } from './onboarding/CompletionCard';

export interface OnboardingData {
  name: string;
  courtRole: string;
  playingLevel: string;
  seasonGoals: string[];
  parentEmail: string | null;
}

export type OnboardingCompletionAction = 'start_game' | 'pregame_talk';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData, action?: OnboardingCompletionAction) => void;
}

const TOTAL_STEPS = 4;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 500;

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isEntering, setIsEntering] = useState(true);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    courtRole: '',
    playingLevel: '',
    seasonGoals: [],
    parentEmail: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (
      (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) &&
      currentStep > 0
    ) {
      goBack();
    }
  }, [currentStep, goBack]);

  const handleNameSubmit = (name: string) => {
    setData(prev => ({ ...prev, name }));
    setDirection(1);
    setCurrentStep(1);
  };

  const handlePlayerIdentitySubmit = (role: string, level: string) => {
    setData(prev => ({ ...prev, courtRole: role, playingLevel: level }));
    setDirection(1);
    setCurrentStep(2);
  };

  const handleGoalsSubmit = (goals: string[]) => {
    setData(prev => ({ ...prev, seasonGoals: goals }));
    setDirection(1);
    setCurrentStep(3);
  };

  const handleStartGame = () => {
    onComplete(data, 'start_game');
  };

  const handlePregameTalk = () => {
    onComplete(data, 'pregame_talk');
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
    >
      {/* Header with progress */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        className="pt-12 pb-4"
      >
        <ProgressDots currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </motion.div>

      {/* Swipe hint for mobile - only show on first step */}
      {currentStep === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="text-center text-xs text-muted-foreground px-4"
        >
          Swipe right to go back
        </motion.p>
      )}

      {/* Card content with swipe gestures */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex items-center justify-center overflow-hidden"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.25 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full touch-pan-y"
          >
            {currentStep === 0 && (
              <IdentityCard 
                value={data.name} 
                onNext={handleNameSubmit} 
              />
            )}
            {currentStep === 1 && (
              <PlayerIdentityCard 
                roleValue={data.courtRole}
                levelValue={data.playingLevel}
                onNext={handlePlayerIdentitySubmit} 
              />
            )}
            {currentStep === 2 && (
              <GoalsCard 
                value={data.seasonGoals} 
                onNext={handleGoalsSubmit} 
              />
            )}
            {currentStep === 3 && (
              <CompletionCard 
                playerName={data.name}
                onStartGame={handleStartGame}
                onPregameTalk={handlePregameTalk}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Back button for steps > 0 and < final step */}
      {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 0.6, x: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={goBack}
          className="absolute bottom-8 left-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </motion.button>
      )}
    </motion.div>
  );
}
