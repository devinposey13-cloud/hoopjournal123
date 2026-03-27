import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '@/hooks/usePlanState';
import { PaywallSheet } from './PaywallSheet';
import { PurchaseConfirmationDialog } from '@/components/purchase/PurchaseConfirmationDialog';
import { planCatalog } from '@/lib/plans';

export function GlobalPaywall() {
  const { paywallOpen, paywallReason, currentPlan, closePaywall, setCurrentPlan } = usePlan();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedPlanName, setConfirmedPlanName] = useState('');

  return (
    <>
      <PaywallSheet
        open={paywallOpen}
        reason={paywallReason}
        currentPlan={currentPlan}
        onClose={closePaywall}
        onUpgrade={(planId) => {
          setCurrentPlan(planId);
          closePaywall();
          setConfirmedPlanName(planCatalog[planId]?.name || 'your plan');
          setShowConfirmation(true);
        }}
      />
      <PurchaseConfirmationDialog
        open={showConfirmation}
        planName={confirmedPlanName}
        onGoToDashboard={() => {
          setShowConfirmation(false);
          navigate('/');
        }}
      />
    </>
  );
}
