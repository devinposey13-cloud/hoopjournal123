import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AgeConfirmationGate } from './onboarding/AgeConfirmationGate';
import { OnboardingBackground } from './onboarding/OnboardingBackground';
import { ProgressDots } from './onboarding/ProgressDots';
import { WelcomeCard } from './onboarding/WelcomeCard';
import { PlayerIdentityCard } from './onboarding/PlayerIdentityCard';
import { GoalsCard } from './onboarding/GoalsCard';
import { PricingPreviewCard } from './onboarding/PricingPreviewCard';
import { NativePurchaseSheet } from './purchase/NativePurchaseSheet';
import { track, type PlanId, type BillingCycle } from '@/lib/plans';
import { useBilling } from '@/hooks/useBilling';
import { isNativeApp, getPlatform } from '@/lib/platform';
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

const TOTAL_STEPS = 4;

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [nativeSheetOpen, setNativeSheetOpen] = useState(false);
  const [nativeSelectedPlan, setNativeSelectedPlan] = useState<PlanId>('pro');
  const [nativeBillingCycle, setNativeBillingCycle] = useState<BillingCycle>('monthly');
  const navigate = useNavigate();
  const native = isNativeApp();
  const { purchasePlan, isPurchasing, isNative } = useBilling();
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
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goForward = useCallback((step: number) => {
    setDirection(1);
    setCurrentStep(step);
  }, []);

  const handleWelcome = (name: string) => {
    setData((prev) => ({ ...prev, name }));
    goForward(1);
  };

  const handleSkip = () => {
    onComplete(data, 'explore_dashboard');
  };

  const handlePlayerIdentitySubmit = (role: string, level: string) => {
    setData((prev) => ({ ...prev, courtRole: role, playingLevel: level }));
    goForward(2);
  };

  const handleGoalsSubmit = (goals: string[]) => {
    setData((prev) => ({ ...prev, seasonGoals: goals }));
    goForward(3);
  };

  const handleSelectFree = () => {
    track('onboarding_plan_selected', { planId: 'free' });
    onComplete(data, 'explore_dashboard');
  };

  const handleSelectPaid = async (planId: PlanId, billingCycle: BillingCycle) => {
    console.log('[Onboarding] handleSelectPaid', { planId, billingCycle, native, rcAvailable, rcLoading, platform: getPlatform(), hasWebkit: !!(window as any).webkit?.messageHandlers });
    track('onboarding_plan_checkout_started', { planId, billingCycle, native });

    try {
      if (native) {
        console.log('[Onboarding] → Native path (RevenueCat)');
        if (rcLoading) {
          toast.info('Loading purchase options… please wait.');
          return;
        }
        if (!rcAvailable) {
          toast.error('In-app purchases are not available right now. Please try again.');
          return;
        }

        setNativeSelectedPlan(planId);
        setNativeBillingCycle(billingCycle);
        setNativeSheetOpen(true);
        return;
      }

      console.log('[Onboarding] → Web path (Stripe)');
      await createCheckout(planId, billingCycle, 'onboarding');
      toast.info('Redirecting to checkout...');
    } catch (err) {
      console.error('[Onboarding] Checkout failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to start checkout. Try again.';
      if (!msg.includes('cancelled') && !msg.includes('canceled')) {
        toast.error(msg);
      }
    }
  };

  useEffect(() => {
    if (currentStep === 3) {
      track('onboarding_pricing_viewed', {});
    }
  }, [currentStep]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 200 : -200,
      opacity: 0,
      scale: 0.95,
      filter: 'blur(4px)',
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -200 : 200,
      opacity: 0,
      scale: 0.95,
      filter: 'blur(4px)',
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
      <OnboardingBackground />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        className="pt-12 pb-4"
      >
        <ProgressDots currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </motion.div>

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
              x: { type: 'spring', stiffness: 260, damping: 26 },
              opacity: { duration: 0.3, ease: 'easeInOut' },
              scale: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.3 },
            }}
            className="w-full"
          >
            {currentStep === 0 && (
              <WelcomeCard value={data.name} onNext={handleWelcome} onSkip={handleSkip} />
            )}
            {currentStep === 1 && (
              <PlayerIdentityCard
                roleValue={data.courtRole}
                levelValue={data.playingLevel}
                onNext={handlePlayerIdentitySubmit}
              />
            )}
            {currentStep === 2 && (
              <GoalsCard value={data.seasonGoals} onNext={handleGoalsSubmit} />
            )}
            {currentStep === 3 && (
              <PricingPreviewCard
                onSelectFree={handleSelectFree}
                onSelectPaid={handleSelectPaid}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {currentStep > 0 && (
          <motion.button
            key="back-button"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 0.6, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            whileHover={{ opacity: 1, x: 2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={goBack}
            className="absolute bottom-8 left-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </motion.button>
        )}
      </AnimatePresence>

      {native && (
        <NativePurchaseSheet
          open={nativeSheetOpen}
          onClose={() => setNativeSheetOpen(false)}
          recommendedPlan={nativeSelectedPlan}
          initialBillingCycle={nativeBillingCycle}
          onPurchaseComplete={() => {
            setNativeSheetOpen(false);
            navigate('/onboarding/finish');
            onComplete(data, 'explore_dashboard');
          }}
        />
      )}
    </motion.div>
  );
}
