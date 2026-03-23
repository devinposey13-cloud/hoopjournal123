import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Lock, RotateCcw, Loader2 } from 'lucide-react';
import { PlanCard } from '@/components/pricing/PlanCard';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';
import { NativePurchaseSheet } from '@/components/purchase/NativePurchaseSheet';
import {
  type BillingCycle,
  type PlanId,
  type PaywallReason,
  planCatalog,
  planOrder,
  paywallConfigs,
  track,
} from '@/lib/plans';
import { usePlan } from '@/hooks/usePlanState';
import { useBilling } from '@/hooks/useBilling';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

export default function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = (searchParams.get('reason') as PaywallReason) || 'season_report';
  const config = paywallConfigs[reason];
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { currentPlan } = usePlan();
  const { purchasePlan, restorePurchases, isPurchasing, isRestoring, isNative, diagnostics, debugLog } = useBilling();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const native = isNativeApp();

  // Native purchase sheet state
  const [nativeSheetOpen, setNativeSheetOpen] = useState(false);
  const [nativeSheetPlan, setNativeSheetPlan] = useState<PlanId>('pro');

  const upgradePlans = planOrder.filter(
    (id) => id !== 'free' && planOrder.indexOf(id) > planOrder.indexOf(currentPlan)
  );

  const handleSelect = async (planId: PlanId) => {
    console.log('[Upgrade] handleSelect', { planId, cycle, isNative, platform: diagnostics.platform });
    track('upgrade_clicked', { planId, cycle, isNative });

    // On native, open the hardened purchase sheet
    if (native) {
      setNativeSheetPlan(planId);
      setNativeSheetOpen(true);
      return;
    }

    setLoadingPlan(planId);
    try {
      await purchasePlan(planId, cycle);
    } catch {
      // Error already handled by useBilling
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      toast.success('Purchases restored!');
    } catch {
      toast.error('Failed to restore purchases');
    }
  };

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        {/* Reason header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-4">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">{config.title}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
            Upgrade to unlock this feature
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {config.description}
          </p>
        </motion.div>

        <div className="flex justify-center mb-8">
          <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {upgradePlans.map((id, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <PlanCard
                plan={planCatalog[id]}
                cycle={cycle}
                currentPlan={currentPlan}
                onSelect={handleSelect}
              />
            </motion.div>
          ))}
        </div>

        <div className="text-center space-y-3">
          {isNative && (
            <Button
              variant="ghost"
              onClick={handleRestore}
              disabled={isRestoring}
              className="text-muted-foreground text-xs"
            >
              {isRestoring ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
              Restore Purchases
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground">
            Not now
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Cancel anytime. Your data stays yours.
          </p>
          {/* Debug toggle */}
          <button
            type="button"
            className="text-xs text-muted-foreground/60 mt-4 py-2 px-4 underline cursor-pointer select-none"
            onClick={() => setShowDebug((v) => !v)}
          >
            v{isNative ? 'native' : 'web'} · tap to debug
          </button>
          {showDebug && (
            <div className="mt-3 bg-black/90 text-green-400 text-[10px] font-mono rounded-lg p-3 text-left max-h-48 overflow-y-auto whitespace-pre-wrap">
              <div>isDespia: {String(diagnostics.isDespia)}</div>
              <div>isDespiaIOS: {String(diagnostics.isDespiaIOS)}</div>
              <div>isDespiaAndroid: {String(diagnostics.isDespiaAndroid)}</div>
              <div>isWeb: {String(diagnostics.isWeb)}</div>
              <div>platform: {diagnostics.platform}</div>
              <div>isPurchasing: {String(isPurchasing)}</div>
              <div>isRestoring: {String(isRestoring)}</div>
              <div className="border-t border-green-800 mt-2 pt-2">
                {debugLog.length === 0 ? '(no log entries yet)' : debugLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Native hardened purchase sheet */}
      <NativePurchaseSheet
        open={nativeSheetOpen}
        onClose={() => setNativeSheetOpen(false)}
        onPurchaseComplete={() => {
          toast.success('Subscription activated! 🎉');
        }}
        recommendedPlan={nativeSheetPlan}
        initialBillingCycle={cycle}
      />
    </div>
  );
}
