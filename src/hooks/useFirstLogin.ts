import { useState, useEffect } from 'react';
import type { PlayerProfile } from '@/types/basketball';

interface UseFirstLoginParams {
  profile: PlayerProfile | null;
  profileLoading: boolean;
}

export function useFirstLogin({ profile, profileLoading }: UseFirstLoginParams) {
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
      setShowOnboarding(false);
      setLoading(false);
      return;
    }

    // Database says NOT completed - show onboarding
    setShowOnboarding(true);
    setLoading(false);
  }, [profile, profileLoading]);

  const completeOnboarding = () => {
    // Note: The database update happens in handleOnboardingComplete in Index.tsx
    // This just updates local state
    setShowOnboarding(false);
  };

  return { 
    showOnboarding,
    loading, 
    completeOnboarding,
  };
}
