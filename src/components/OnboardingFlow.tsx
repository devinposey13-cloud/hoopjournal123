import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AgeConfirmationGate } from './onboarding/AgeConfirmationGate';
import { ProgressDots } from './onboarding/ProgressDots';
import { WelcomeCard } from './onboarding/WelcomeCard';
import { IdentityCard } from './onboarding/IdentityCard';
import { PlayerIdentityCard } from './onboarding/PlayerIdentityCard';
import { GoalsCard } from './onboarding/GoalsCard';

import { CoachPreviewCard } from './onboarding/CoachPreviewCard';
import { PricingPreviewCard } from './onboarding/PricingPreviewCard';
import { track, type PlanId, type BillingCycle } from '@/lib/plans';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export interface OnboardingData {
  name: string;
  courtRole: string;
  playingLevel: string;
  seasonGoals: string[];
  parentEmail: string | null;
  
}

export type OnboardingCompletionAction = 'start_game' | 'pregame_talk' | 'explore_dashboard';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData, action?: OnboardingCompletionAction) => void;
}

const TOTAL_STEPS = 6;

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();
  const { createCheckout } = useSubscription();
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

  const goForward = useCallback((step: number) => {
    setDirection(1);
    setCurrentStep(step);
  }, []);

  // Step handlers
  const handleWelcome = () => goForward(1);
  const handleSkip = () => {
    onComplete(data, 'explore_dashboard');
  };

  const handleNameSubmit = (name: string) => {
    setData(prev => ({ ...prev, name }));
    goForward(2);
  };

  const handlePlayerIdentitySubmit = (role: string, level: string) => {
    setData(prev => ({ ...prev, courtRole: role, playingLevel: level }));
    goForward(3);
  };

  const handleGoalsSubmit = (goals: string[]) => {
    setData(prev => ({ ...prev, seasonGoals: goals }));
    goForward(4);
  };

  const handleCoachPreview = () => {
    goForward(5);
  };


  const handleSelectFree = () => {
    track('onboarding_plan_selected', { planId: 'free' });
    navigate('/onboarding/finish');
    onComplete(data, 'explore_dashboard');
  };

  const handleSelectPaid = async (planId: PlanId, billingCycle: BillingCycle) => {
    track('onboarding_plan_checkout_started', { planId, billingCycle });
    console.log('[Onboarding] Starting checkout for paid plan:', { planId, billingCycle });

    try {
      await createCheckout(planId, billingCycle, 'onboarding');
      // On mobile, createCheckout redirects in same tab, so this toast may not be seen
      toast.info('Redirecting to checkout...');
    } catch (err) {
      console.error('[Onboarding] Checkout failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout. Try again.');
    }
  };

  // Track pricing preview view
  useEffect(() => {
    if (currentStep === 5) {
      track('onboarding_pricing_viewed', {});
    }
  }, [currentStep]);

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

  if (!ageConfirmed) {
    return <AgeConfirmationGate onConfirmed={() => setAgeConfirmed(true)} />;
  }

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
            className="w-full"
          >
            {currentStep === 0 && (
              <WelcomeCard onNext={handleWelcome} onSkip={handleSkip} />
            )}
            {currentStep === 1 && (
              <IdentityCard value={data.name} onNext={handleNameSubmit} />
            )}
            {currentStep === 2 && (
              <PlayerIdentityCard
                roleValue={data.courtRole}
                levelValue={data.playingLevel}
                onNext={handlePlayerIdentitySubmit}
              />
            )}
            {currentStep === 3 && (
              <GoalsCard value={data.seasonGoals} onNext={handleGoalsSubmit} />
            )}
            {currentStep === 4 && (
              <CoachPreviewCard playerName={data.name} onNext={handleCoachPreview} />
            )}
            {currentStep === 5 && (
              <PricingPreviewCard
                onSelectFree={handleSelectFree}
                onSelectPaid={handleSelectPaid}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Back button */}
      {currentStep > 0 && (
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
