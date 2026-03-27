import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, X } from 'lucide-react';
import { PurchaseConfirmationDialog } from '@/components/purchase/PurchaseConfirmationDialog';
import { PlanCard } from '@/components/pricing/PlanCard';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';
import { PlanCompareTable } from '@/components/pricing/PlanCompareTable';
import { FAQAccordion } from '@/components/pricing/FAQAccordion';
import { PromoCodeInput } from '@/components/pricing/PromoCodeInput';
import { NativePurchaseSheet } from '@/components/purchase/NativePurchaseSheet';
import { type BillingCycle, type PlanId, planCatalog, planOrder, track } from '@/lib/plans';
import { usePlan } from '@/hooks/usePlanState';
import { useBilling } from '@/hooks/useBilling';
import { isNativeApp } from '@/lib/platform';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { currentPlan } = usePlan();
  const { purchasePlan, isPurchasing, diagnostics, debugLog } = useBilling();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [promoApplied, setPromoApplied] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedPlanName, setConfirmedPlanName] = useState('');
  const native = isNativeApp();

  // Native purchase sheet state
  const [nativeSheetOpen, setNativeSheetOpen] = useState(false);
  const [nativeSheetPlan, setNativeSheetPlan] = useState<PlanId>('pro');

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (canceled === 'true') {
      toast.info("Checkout canceled — you're still on the Free plan.");
    }
    if (success === 'true') {
      setConfirmedPlanName('your plan');
      setShowConfirmation(true);
    }
  }, [canceled, success]);

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'free') {
      toast.info("You're already on the Free plan!");
      return;
    }
    if (planId === currentPlan) {
      toast.info(`You're already on the ${planCatalog[planId].name} plan!`);
      return;
    }
    console.log('[Pricing] handleSelectPlan', { planId, cycle, native, platform: diagnostics.platform });
    track('upgrade_clicked', { planId, cycle, native });

    // On native, open the hardened purchase sheet instead of raw purchase
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Journal
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full">
            <X className="w-5 h-5" />
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
          <button
            type="button"
            className="text-xs text-muted-foreground/60 mt-4 py-2 px-4 underline cursor-pointer select-none"
            onClick={() => setShowDebug((v) => !v)}
          >
            v{native ? 'native' : 'web'} · tap to debug
          </button>
          {showDebug && (
            <div className="mt-3 bg-black/90 text-green-400 text-[10px] font-mono rounded-lg p-3 text-left max-h-48 overflow-y-auto whitespace-pre-wrap">
              <div>isDespia: {String(diagnostics.isDespia)}</div>
              <div>isDespiaIOS: {String(diagnostics.isDespiaIOS)}</div>
              <div>isDespiaAndroid: {String(diagnostics.isDespiaAndroid)}</div>
              <div>isWeb: {String(diagnostics.isWeb)}</div>
              <div>platform: {diagnostics.platform}</div>
              <div>isPurchasing: {String(isPurchasing)}</div>
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
        onPurchaseComplete={(planId) => {
          const name = planId ? planCatalog[planId]?.name : 'your plan';
          setConfirmedPlanName(name || 'your plan');
          setShowConfirmation(true);
        }}
        recommendedPlan={nativeSheetPlan}
        initialBillingCycle={cycle}
      />

      <PurchaseConfirmationDialog
        open={showConfirmation}
        planName={confirmedPlanName}
        onGoToDashboard={() => navigate('/')}
      />
    </div>
  );
}
