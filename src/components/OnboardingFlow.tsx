import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    courtRole: '',
    playingLevel: '',
    seasonGoals: [],
    parentEmail: null,
  });

  const handleNameSubmit = (name: string) => {
    setData(prev => ({ ...prev, name }));
    setCurrentStep(1);
  };

  const handleRoleSelect = (role: string) => {
    setData(prev => ({ ...prev, courtRole: role }));
    setCurrentStep(2);
  };

  const handleLevelSelect = (level: string) => {
    setData(prev => ({ ...prev, playingLevel: level }));
    setCurrentStep(3);
  };

  const handleGoalsSubmit = (goals: string[]) => {
    setData(prev => ({ ...prev, seasonGoals: goals }));
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

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with progress */}
      <div className="pt-12 pb-4">
        <ProgressDots currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Card content */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <IdentityCard 
              key="identity"
              value={data.name} 
              onNext={handleNameSubmit} 
            />
          )}
          {currentStep === 1 && (
            <RoleCard 
              key="role"
              value={data.courtRole} 
              onNext={handleRoleSelect} 
            />
          )}
          {currentStep === 2 && (
            <LevelCard 
              key="level"
              value={data.playingLevel} 
              onNext={handleLevelSelect} 
            />
          )}
          {currentStep === 3 && (
            <GoalsCard 
              key="goals"
              value={data.seasonGoals} 
              onNext={handleGoalsSubmit} 
            />
          )}
          {currentStep === 4 && (
            <FamilyCard 
              key="family"
              value={data.parentEmail || ''} 
              onNext={handleFamilySubmit} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Back button for steps > 0 */}
      {currentStep > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          whileHover={{ opacity: 1 }}
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="absolute bottom-8 left-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </motion.button>
      )}
    </div>
  );
}
