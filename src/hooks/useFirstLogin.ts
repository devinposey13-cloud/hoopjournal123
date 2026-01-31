import { useState, useEffect } from 'react';

const INTRO_SEEN_KEY = 'hoopjournal_intro_seen';

export function useFirstLogin() {
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem(INTRO_SEEN_KEY);
    if (!hasSeenIntro) {
      setShowIntro(true);
    }
    setLoading(false);
  }, []);

  const completeIntro = () => {
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    setShowIntro(false);
  };

  // For testing: reset the intro flag
  const resetIntro = () => {
    localStorage.removeItem(INTRO_SEEN_KEY);
    setShowIntro(true);
  };

  return { showIntro, loading, completeIntro, resetIntro };
}
