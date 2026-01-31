import { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ProgressDots } from './onboarding/ProgressDots';
import { IdentityCard } from './onboarding/IdentityCard';
import { RoleCard } from './onboarding/RoleCard';
import { LevelCard } from './onboarding/LevelCard';
import { GoalsCard } from './onboarding/GoalsCard';
import { FamilyCard } from './onboarding/FamilyCard';
import { TransitionScreen } from './onboarding/TransitionScreen';

export interface OnboardingData {
  name: string;
  courtRole: string;
  playingLevel: string;
  seasonGoals: string[];
  parentEmail: string | null;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

const TOTAL_STEPS = 5;
const SWIPE_THRESHOLD = 50; // Minimum distance to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 500; // Velocity threshold for quick swipes

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward
  const [data, setData] = useState<OnboardingData>({
    name: '',
    courtRole: '',
    playingLevel: '',
    seasonGoals: [],
    parentEmail: null,
  });

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goForward = useCallback((stepData?: Partial<OnboardingData>) => {
    if (stepData) {
      setData(prev => ({ ...prev, ...stepData }));
    }
    setDirection(1);
  }, []);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // Swipe right to go back (positive x offset)
    if (
      (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) &&
      currentStep > 0
    ) {
      goBack();
    }
    // Note: Swipe left to go forward is not implemented because
    // each card has specific completion requirements (name input, selections, etc.)
  }, [currentStep, goBack]);

  const handleNameSubmit = (name: string) => {
    setData(prev => ({ ...prev, name }));
    setDirection(1);
    setCurrentStep(1);
  };

  const handleRoleSelect = (role: string) => {
    setData(prev => ({ ...prev, courtRole: role }));
    setDirection(1);
    setCurrentStep(2);
  };

  const handleLevelSelect = (level: string) => {
    setData(prev => ({ ...prev, playingLevel: level }));
    setDirection(1);
    setCurrentStep(3);
  };

  const handleGoalsSubmit = (goals: string[]) => {
    setData(prev => ({ ...prev, seasonGoals: goals }));
    setDirection(1);
    setCurrentStep(4);
  };

  const handleFamilySubmit = (email: string | null) => {
    const finalData = { ...data, parentEmail: email };
    setData(finalData);
    setShowTransition(true);
  };

  const handleTransitionComplete = () => {
    onComplete(data);
  };

  if (showTransition) {
    return <TransitionScreen playerName={data.name} onComplete={handleTransitionComplete} />;
  }

  // Animation variants for swipe transitions
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header with progress */}
      <div className="pt-12 pb-4">
        <ProgressDots currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </div>

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
      <div className="flex-1 flex items-center justify-center overflow-hidden">
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
              opacity: { duration: 0.2 },
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
              <RoleCard 
                value={data.courtRole} 
                onNext={handleRoleSelect} 
              />
            )}
            {currentStep === 2 && (
              <LevelCard 
                value={data.playingLevel} 
                onNext={handleLevelSelect} 
              />
            )}
            {currentStep === 3 && (
              <GoalsCard 
                value={data.seasonGoals} 
                onNext={handleGoalsSubmit} 
              />
            )}
            {currentStep === 4 && (
              <FamilyCard 
                value={data.parentEmail || ''} 
                onNext={handleFamilySubmit} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Back button for steps > 0 */}
      {currentStep > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          whileHover={{ opacity: 1 }}
          onClick={goBack}
          className="absolute bottom-8 left-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </motion.button>
      )}
    </div>
  );
}
