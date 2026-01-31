import { useState, useEffect } from 'react';

const INTRO_SEEN_KEY = 'hoopjournal_intro_seen';
const ONBOARDING_COMPLETE_KEY = 'hoopjournal_onboarding_complete';

export function useFirstLogin() {
  const [showIntro, setShowIntro] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem(INTRO_SEEN_KEY);
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    
    if (!hasSeenIntro) {
      setShowIntro(true);
    } else if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
    setLoading(false);
  }, []);

  const completeIntro = () => {
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    setShowIntro(false);
    // After intro, show onboarding if not completed
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setShowOnboarding(false);
  };

  // For testing: reset both flags
  const resetIntro = () => {
    localStorage.removeItem(INTRO_SEEN_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
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
