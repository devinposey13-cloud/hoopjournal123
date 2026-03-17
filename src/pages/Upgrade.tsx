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
import { useSubscription } from '@/hooks/useSubscription';
import { usePlan } from '@/hooks/usePlanState';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

export default function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = (searchParams.get('reason') as PaywallReason) || 'season_report';
  const config = paywallConfigs[reason];
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { currentPlan } = usePlan();
  const { createCheckout } = useSubscription();
  const { isAvailable: rcAvailable, offerings: rcOfferings, purchasePackage, restorePurchases, isLoading: rcLoading } = useRevenueCat();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [nativeSheetOpen, setNativeSheetOpen] = useState(false);
  const [nativeSelectedPlan, setNativeSelectedPlan] = useState<PlanId>('pro');
  const native = isNativeApp();

  const upgradePlans = planOrder.filter(
    (id) => id !== 'free' && planOrder.indexOf(id) > planOrder.indexOf(currentPlan)
  );

  const getNativePriceString = (planId: PlanId): string | undefined => {
    if (!native || !rcAvailable) return undefined;
    const suffix = cycle === 'yearly' ? 'year' : 'month';
    return rcOfferings.find(
      (o) => o.planId === planId && o.period.toLowerCase().includes(suffix)
    )?.priceString;
  };

  const handleSelect = async (planId: PlanId) => {
    console.log('[Upgrade] handleSelect', { planId, cycle, native, rcAvailable, rcLoading, platform: getPlatform() });
    track('upgrade_clicked', { planId, cycle, native });

    // On native, use RevenueCat via NativePurchaseSheet
    if (native) {
      console.log('[Upgrade] → Native path (RevenueCat)');
      if (rcLoading) {
        toast.info('Loading purchase options… please wait.');
        return;
      }
      if (!rcAvailable) {
        toast.error('In-app purchases are not available right now. Please try again.');
        return;
      }
      setNativeSelectedPlan(planId);
      setNativeSheetOpen(true);
      return;
    }

    // Web: Stripe checkout
    console.log('[Upgrade] → Web path (Stripe)');
    setLoadingPlan(planId);
    try {
      await createCheckout(planId, cycle);
      toast.success('Redirecting to checkout...');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start checkout';
      if (!msg.includes('cancelled') && !msg.includes('canceled')) {
        toast.error(msg);
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      toast.success('Purchases restored!');
    } catch {
      toast.error('Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };

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

        {/* Native loading indicator */}
        {native && rcLoading && (
          <div className="flex justify-center items-center gap-2 mb-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading App Store prices…</span>
          </div>
        )}

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
                nativePriceString={getNativePriceString(id)}
              />
            </motion.div>
          ))}
        </div>

        <div className="text-center space-y-3">
          {native && (
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
        </div>
      </div>

      {/* Native purchase sheet */}
      {native && (
        <NativePurchaseSheet
          open={nativeSheetOpen}
          onClose={() => setNativeSheetOpen(false)}
          recommendedPlan={nativeSelectedPlan}
          onPurchaseComplete={() => {
            setNativeSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
