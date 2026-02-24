import { useState, useCallback, createContext, useContext } from 'react';
import { PlanId, PaywallReason, paywallConfigs, mockUsage, UsageData, track } from '@/lib/plans';

interface PlanState {
  currentPlan: PlanId;
  usage: UsageData;
  paywallOpen: boolean;
  paywallReason: PaywallReason | null;
  setCurrentPlan: (plan: PlanId) => void;
  openPaywall: (reason: PaywallReason) => void;
  closePaywall: () => void;
}

export function usePlanState(): PlanState {
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason | null>(null);

  const openPaywall = useCallback((reason: PaywallReason) => {
    const config = paywallConfigs[reason];
    track('paywall_shown', { reason, recommendedPlan: config.recommendedPlan });
    
    if (config.mode === 'fullscreen') {
      // For fullscreen, we still set state so the upgrade page can read it
      setPaywallReason(reason);
      setPaywallOpen(true);
    } else {
      setPaywallReason(reason);
      setPaywallOpen(true);
    }
  }, []);

  const closePaywall = useCallback(() => {
    if (paywallReason) {
      track('upgrade_dismissed', { reason: paywallReason });
    }
    setPaywallOpen(false);
    setPaywallReason(null);
  }, [paywallReason]);

  return {
    currentPlan,
    usage: mockUsage,
    paywallOpen,
    paywallReason,
    setCurrentPlan,
    openPaywall,
    closePaywall,
  };
}

// Context for global plan state
export const PlanContext = createContext<PlanState | null>(null);

export function usePlan(): PlanState {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
