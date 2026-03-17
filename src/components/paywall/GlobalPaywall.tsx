import { usePlan } from '@/hooks/usePlanState';
import { PaywallSheet } from './PaywallSheet';

export function GlobalPaywall() {
  const { paywallOpen, paywallReason, currentPlan, closePaywall, setCurrentPlan } = usePlan();

  return (
    <PaywallSheet
      open={paywallOpen}
      reason={paywallReason}
      currentPlan={currentPlan}
      onClose={closePaywall}
      onUpgrade={(planId) => {
        setCurrentPlan(planId);
        closePaywall();
      }}
    />
  );
}
