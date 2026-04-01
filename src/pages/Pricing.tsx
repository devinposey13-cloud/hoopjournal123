import { useState, useEffect } from 'react';
import { PurchaseDebugPanel } from '@/components/billing/PurchaseDebugPanel';
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
import { type BillingCycle, type PlanId, planCatalog, planOrder, track } from '@/lib/plans';
import { usePlan } from '@/hooks/usePlanState';
import { useBilling } from '@/hooks/useBilling';
import { useNativeRC } from '@/hooks/useNativeRC';
import { isNativeApp } from '@/lib/platform';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { currentPlan } = usePlan();
  const { purchasePlan, isPurchasing, diagnostics, debugLog, lastPurchaseResult, forceResetPurchaseState } = useBilling();
  const { findPackage } = useNativeRC();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [promoApplied, setPromoApplied] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedPlanName, setConfirmedPlanName] = useState('');
  const native = isNativeApp();

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

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');


  useEffect(() => {
    if (canceled === 'true') {
      toast.info("Checkout canceled — you're still on the Free plan.");
    }
    if (success === 'true') {
      setConfirmedPlanName('your plan');
      setShowConfirmation(true);
    }
  }, [canceled, success]);

  const getRCProps = (planId: PlanId) => {
    if (!native || planId === 'free') return {};
    const suffix = cycle === 'yearly' ? 'yearly' : 'monthly';
    const productSubstr = `${planId}_${suffix}`;
    const pkg = findPackage(productSubstr);

    return {
      nativePriceString: pkg?.priceString || undefined,
    };
  };

  const handleSelectPlan = async (planId: PlanId) => {
    if (loadingPlan) return;
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

    setLoadingPlan(planId);
    try {
      const result = await purchasePlan(planId, cycle);
      if (result.confirmed) {
        setConfirmedPlanName(planCatalog[planId]?.name || 'your plan');
        setShowConfirmation(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (!msg.includes('cancel')) {
        console.error('[Pricing] Purchase error:', err);
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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

        <div className="flex justify-center mb-10">
          <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
        </div>

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
                {...getRCProps(id)}
              />
            </motion.div>
          ))}
        </div>

        {!native && (
          <div className="mb-12">
            <PromoCodeInput onApplied={() => setPromoApplied(true)} />
          </div>
        )}

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
          <PlanCompareTable />
        </div>

        <Separator className="mb-16" />

        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <FAQAccordion />
        </div>

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
            <div className="mt-3 bg-black/90 text-green-400 text-[10px] font-mono rounded-lg p-3 text-left max-h-[60vh] overflow-y-auto whitespace-pre-wrap">
              <div className="text-yellow-400 font-bold mb-1">── STATE ──</div>
              <div>isPurchasing: <span className={isPurchasing ? 'text-red-400' : 'text-green-400'}>{String(isPurchasing)}</span></div>
              <div>loadingPlan: <span className={loadingPlan ? 'text-red-400' : 'text-green-400'}>{String(loadingPlan)}</span></div>
              <div>lastPurchaseResult: {lastPurchaseResult}</div>
              <div>globalInFlight: <span id="debug-global-flag" /></div>

              <div className="text-yellow-400 font-bold mt-2 mb-1">── PLATFORM ──</div>
              <div>isDespia: {String(diagnostics.isDespia)}</div>
              <div>isDespiaIOS: {String(diagnostics.isDespiaIOS)}</div>
              <div>isDespiaAndroid: {String(diagnostics.isDespiaAndroid)}</div>
              <div>isWeb: {String(diagnostics.isWeb)}</div>
              <div>platform: {diagnostics.platform}</div>

              <div className="text-yellow-400 font-bold mt-2 mb-1">── CALLBACKS ──</div>
              <div>onRevenueCatPurchase: {typeof window.onRevenueCatPurchase}</div>
              <div>onRevenueCatPaywallDismiss: {typeof (window as any).onRevenueCatPaywallDismiss}</div>

              <div className="text-yellow-400 font-bold mt-2 mb-1">── ACTIONS ──</div>
              <div className="flex gap-2 flex-wrap mb-2">
                <button
                  className="bg-red-800 text-white px-2 py-1 rounded text-[10px]"
                  onClick={() => {
                    forceResetPurchaseState();
                    setLoadingPlan(null);
                  }}
                >
                  Force Reset State
                </button>
                <button
                  className="bg-blue-800 text-white px-2 py-1 rounded text-[10px]"
                  onClick={() => {
                    navigator.clipboard?.writeText(debugLog.join('\n')).then(() => toast.info('Log copied'));
                  }}
                >
                  Copy Log
                </button>
              </div>

              <div className="text-yellow-400 font-bold mt-2 mb-1">── LOG ({debugLog.length} entries) ──</div>
              <div className="border-t border-green-800 pt-1">
                {debugLog.length === 0 ? '(no log entries yet)' : debugLog.slice(-50).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
          <PurchaseDebugPanel visible={showDebug} />
        </div>
      </div>

      <PurchaseConfirmationDialog
        open={showConfirmation}
        planName={confirmedPlanName}
        onGoToDashboard={() => navigate('/')}
      />
    </div>
  );
}
