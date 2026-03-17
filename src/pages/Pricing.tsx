import { useState, useEffect } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PlanCard } from '@/components/pricing/PlanCard';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';
import { PlanCompareTable } from '@/components/pricing/PlanCompareTable';
import { FAQAccordion } from '@/components/pricing/FAQAccordion';
import { PromoCodeInput } from '@/components/pricing/PromoCodeInput';
import { NativePurchaseSheet } from '@/components/purchase/NativePurchaseSheet';
import { type BillingCycle, type PlanId, planCatalog, planOrder, track } from '@/lib/plans';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlan } from '@/hooks/usePlanState';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { isNativeApp, getPlatform } from '@/lib/platform';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { currentPlan } = usePlan();
  const { createCheckout } = useSubscription();
  const { isAvailable: rcAvailable, offerings: rcOfferings, purchasePackage, isLoading: rcLoading, debugLog } = useRevenueCat();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [promoApplied, setPromoApplied] = useState(false);
  const [nativeSheetOpen, setNativeSheetOpen] = useState(false);
  const [nativeSelectedPlan, setNativeSelectedPlan] = useState<PlanId>('pro');
  const [showDebug, setShowDebug] = useState(false);
  const native = isNativeApp();

  // Check if user already has promo_eligible in plan_overrides
  useEffect(() => {
    const checkPromo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('plan_overrides')
        .select('promo_eligible, promo_type')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.promo_eligible) {
        setPromoApplied(true);
      }
    };
    checkPromo();
  }, []);

  // Show success/canceled toasts from Stripe redirect
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  // Show toast on cancel/success redirect
  useEffect(() => {
    if (canceled === 'true') {
      toast.info("Checkout canceled — you're still on the Free plan.");
    }
    if (success === 'true') {
      toast.success('Subscription activated! 🎉');
    }
  }, [canceled, success]);

  const getNativePriceString = (planId: PlanId): string | undefined => {
    if (!native || !rcAvailable) return undefined;
    const suffix = cycle === 'yearly' ? 'year' : 'month';
    return rcOfferings.find(
      (o) => o.planId === planId && o.period.toLowerCase().includes(suffix)
    )?.priceString;
  };

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'free') {
      toast.info("You're already on the Free plan!");
      return;
    }
    if (planId === currentPlan) {
      toast.info(`You're already on the ${planCatalog[planId].name} plan!`);
      return;
    }
    console.log('[Pricing] handleSelectPlan', { planId, cycle, native, rcAvailable, rcLoading, platform: getPlatform() });
    track('upgrade_clicked', { planId, cycle, native });

    // On native, use RevenueCat via NativePurchaseSheet
    if (native) {
      console.log('[Pricing] → Native path (RevenueCat)');
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
    console.log('[Pricing] → Web path (Stripe)');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Journal
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Your basketball journey,{' '}
            <span className="text-gradient">tracked like a pro.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free. Upgrade when you're ready.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
        </div>

        {/* Native loading indicator */}
        {native && rcLoading && (
          <div className="flex justify-center items-center gap-2 mb-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading App Store prices…</span>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {planOrder.map((id, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <PlanCard
                plan={planCatalog[id]}
                cycle={cycle}
                currentPlan={currentPlan}
                onSelect={handleSelectPlan}
                promoApplied={promoApplied}
                nativePriceString={getNativePriceString(id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Promo Code - hide on native since App Store handles pricing */}
        {!native && (
          <div className="mb-12">
            <PromoCodeInput onApplied={() => setPromoApplied(true)} />
          </div>
        )}

        {/* Compare table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
          <PlanCompareTable />
        </div>

        <Separator className="mb-16" />

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <FAQAccordion />
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-sm text-muted-foreground">
            Cancel anytime. No long-term contracts.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2026 Hoop Journal™. Questions? Contact us at support@hoopjournal.me
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
