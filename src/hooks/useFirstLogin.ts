import { useState, useEffect } from 'react';
import type { PlayerProfile } from '@/types/basketball';

const INTRO_SEEN_KEY = 'hoopjournal_intro_seen';

interface UseFirstLoginParams {
  profile: PlayerProfile | null;
  profileLoading: boolean;
}

export function useFirstLogin({ profile, profileLoading }: UseFirstLoginParams) {
  const [showIntro, setShowIntro] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for profile to load
    if (profileLoading) {
      setLoading(true);
      return;
    }

    // If database shows onboarding completed, skip everything
    if (profile?.onboardingCompletedAt) {
      setShowIntro(false);
      setShowOnboarding(false);
      setLoading(false);
      return;
    }

    // Database says NOT completed - check localStorage for intro
    const hasSeenIntro = localStorage.getItem(INTRO_SEEN_KEY);

    if (!hasSeenIntro) {
      setShowIntro(true);
    } else {
      setShowOnboarding(true);
    }
    setLoading(false);
  }, [profile, profileLoading]);

  const completeIntro = () => {
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    setShowIntro(false);
    // After intro, show onboarding (database confirms it's not complete)
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    // Note: The database update happens in handleOnboardingComplete in Index.tsx
    // This just updates local state
    setShowOnboarding(false);
  };

  // For testing: reset intro flag (database must also be reset separately)
  const resetIntro = () => {
    localStorage.removeItem(INTRO_SEEN_KEY);
    setShowIntro(true);
    setShowOnboarding(false);
  };

  return { 
    showIntro, 
    showOnboarding,
    loading, 
    completeIntro, 
    completeOnboarding,
    resetIntro 
  };
}
