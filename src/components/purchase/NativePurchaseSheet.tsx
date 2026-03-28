/**
 * NativePurchaseSheet — hardened native purchase flow via Despia + RevenueCat.
 *
 * Uses live RC offerings metadata for pricing display.
 */

import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Loader2, RotateCcw, WifiOff, RefreshCw } from 'lucide-react';
import { FeatureList } from '@/components/pricing/FeatureList';
import { type BillingCycle, type PlanId, planCatalog, planOrder, getPlanPrice } from '@/lib/plans';
import { useBilling } from '@/hooks/useBilling';
import { useNativeRC } from '@/hooks/useNativeRC';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface NativePurchaseSheetProps {
  open: boolean;
  onClose: () => void;
  onPurchaseComplete?: (planId: PlanId) => void;
  title?: string;
  description?: string;
  recommendedPlan?: PlanId;
  initialBillingCycle?: BillingCycle;
}

export function NativePurchaseSheet({
  open,
  onClose,
  onPurchaseComplete,
  title = 'Upgrade Your Game',
  description = 'Unlock premium features with a subscription.',
  recommendedPlan = 'pro',
  initialBillingCycle = 'monthly',
}: NativePurchaseSheetProps) {
  const { purchasePlan, restorePurchases, isRestoring, isNative, forceResetPurchaseState } = useBilling();
  const { ready: rcReady, loading: rcLoading, diagnostics: rcDiag, retry: rcRetry, findPackage } = useNativeRC();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState<BillingCycle>(initialBillingCycle);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(recommendedPlan);
  const [loadingMessage, setLoadingMessage] = useState('Loading plans…');
  const [isAttemptingPurchase, setIsAttemptingPurchase] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setIsAttemptingPurchase(false);
      return;
    }

    setSelectedPlan(recommendedPlan);
    setCycle(initialBillingCycle);
  }, [open, recommendedPlan, initialBillingCycle]);

  useEffect(() => {
    if (!rcLoading) return;
    setLoadingMessage('Loading plans…');
    const t1 = setTimeout(() => setLoadingMessage('Still connecting…'), 5000);
    const t2 = setTimeout(() => setLoadingMessage('Almost there…'), 12000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [rcLoading]);

  const tiers = planOrder.filter((id) => id !== 'free') as PlanId[];
  const interactionLocked = isAttemptingPurchase;

  const getRCPrice = (planId: PlanId, billCycle: BillingCycle) => {
    const suffix = billCycle === 'yearly' ? 'yearly' : 'monthly';
    const productSubstr = `${planId}_${suffix}`;
    const pkg = findPackage(productSubstr);
    return pkg?.priceString || null;
  };

  const performSoftReset = () => {
    console.log('[NativePurchaseSheet] paywall_soft_reset_started');
    forceResetPurchaseState();
    setIsAttemptingPurchase(false);
    setResetKey(k => k + 1);
    console.log('[NativePurchaseSheet] paywall_soft_reset_completed');
  };

  const handlePurchase = async () => {
    if (interactionLocked || isRestoring) return;
    if (!isOnline) {
      toast.error('No internet connection. Please reconnect and try again.');
      return;
    }

    console.log(`[NativePurchaseSheet] selected_package plan=${selectedPlan} cycle=${cycle}`);
    setIsAttemptingPurchase(true);

    try {
      const result = await purchasePlan(selectedPlan, cycle);
      if (result.confirmed) {
        onPurchaseComplete?.(selectedPlan);
        onClose();
      }
    } catch {
      console.log('[NativePurchaseSheet] purchase_sheet_dismissed');
      performSoftReset();
    } finally {
      setIsAttemptingPurchase(false);
      console.log('[NativePurchaseSheet] buttons_reenabled');
      // Fallback: verify interactivity after a short delay
      setTimeout(() => {
        if (isAttemptingPurchase) {
          console.log('[NativePurchaseSheet] paywall_still_stuck — forcing recovery');
          performSoftReset();
        }
      }, 800);
    }
  };

  const handleRestore = async () => {
    try {
      const purchases = await restorePurchases();
      const hasActive = purchases.some((p) => p.isActive);
      if (hasActive) {
        toast.success('Your subscription has been restored.');
        onClose();
      } else {
        toast.info('No previous subscription was found for this account.');
      }
    } catch {
      toast.error("We couldn't restore purchases right now. Please try again.");
    }
  };

  const selectedPrice = getRCPrice(selectedPlan, cycle) || `$${getPlanPrice(selectedPlan, cycle)}`;

  const renderContent = () => {
    if (!isOnline && isNative) {
      return (
        <div className="py-12 text-center space-y-4">
          <WifiOff className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No internet connection. Please reconnect and try again.</p>
          <DrawerClose asChild>
            <Button variant="ghost" className="text-muted-foreground">Close</Button>
          </DrawerClose>
        </div>
      );
    }

    if (isNative && rcLoading) {
      return (
        <div className="py-12 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      );
    }

    if (isNative && !rcReady && !rcLoading) {
      return (
        <div className="py-12 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Unable to load subscription plans.</p>
          <p className="text-xs text-muted-foreground/60">
            {rcDiag.rc_error || 'Please check your connection and try again.'}
          </p>
          <div className="flex flex-col gap-2 items-center">
            <Button variant="outline" size="sm" onClick={rcRetry} className="gap-2">
              <RefreshCw className="w-3 h-3" /> Retry
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground text-xs"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
              Restore Purchases
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" className="text-muted-foreground text-xs">Close</Button>
            </DrawerClose>
          </div>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground/60">
            <button onClick={() => { onClose(); navigate('/privacy'); }} className="transition-colors hover:text-muted-foreground">
              Privacy Policy
            </button>
            <span>·</span>
            <button onClick={() => { onClose(); navigate('/terms'); }} className="transition-colors hover:text-muted-foreground">
              Terms of Service
            </button>
            <span>·</span>
            <button onClick={() => { onClose(); navigate('/eula'); }} className="transition-colors hover:text-muted-foreground">
              EULA
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-4 px-6 pb-2">
          <div className="flex justify-center">
            <div className="inline-flex gap-1 rounded-full bg-muted p-1">
              <button
                onClick={() => setCycle('monthly')}
                disabled={interactionLocked}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                  cycle === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle('yearly')}
                disabled={interactionLocked}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                  cycle === 'yearly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {tiers.map((id) => {
              const plan = planCatalog[id];
              const price = getRCPrice(id, cycle) || `$${getPlanPrice(id, cycle)}`;
              const isRecommended = id === recommendedPlan;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedPlan(id)}
                  disabled={interactionLocked}
                  className={cn(
                    'flex-1 rounded-xl border-2 p-3 text-center transition-all duration-200',
                    interactionLocked && selectedPlan !== id && 'opacity-50',
                    selectedPlan === id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className="mb-1 text-xs font-semibold">{plan.name}</div>
                  <div className="text-lg font-extrabold">{price}</div>
                  <div className="text-[10px] text-muted-foreground">/{cycle === 'monthly' ? 'mo' : 'yr'}</div>
                  {isRecommended && (
                    <Badge className="mt-1.5 border-0 bg-primary/20 px-1.5 py-0 text-[9px] text-primary">
                      Recommended
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What you get with {planCatalog[selectedPlan].name}
            </p>
            <FeatureList features={planCatalog[selectedPlan].features.filter((f) => f.included)} />
          </div>
        </div>

        <DrawerFooter className="pt-2">
          <Button
            onClick={handlePurchase}
            disabled={interactionLocked}
            className="gradient-primary h-12 w-full font-semibold text-primary-foreground"
          >
            {interactionLocked && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {interactionLocked ? 'Processing purchase…' : `Subscribe — ${selectedPrice}/${cycle === 'monthly' ? 'mo' : 'yr'}`}
            {!interactionLocked && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={handleRestore}
            disabled={isRestoring || interactionLocked}
          >
            {isRestoring ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
            Restore Purchases
          </Button>

          <DrawerClose asChild>
            <Button variant="ghost" className="text-muted-foreground" disabled={interactionLocked}>
              Not now
            </Button>
          </DrawerClose>

          <p className="mt-1 text-center text-[10px] text-muted-foreground">Cancel anytime. Your data stays yours.</p>

          <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-muted-foreground/60">
            <button onClick={() => { onClose(); navigate('/terms'); }} className="transition-colors hover:text-muted-foreground">
              Terms of Service
            </button>
            <span>·</span>
            <button onClick={() => { onClose(); navigate('/privacy'); }} className="transition-colors hover:text-muted-foreground">
              Privacy Policy
            </button>
            <span>·</span>
            <button onClick={() => { onClose(); navigate('/eula'); }} className="transition-colors hover:text-muted-foreground">
              EULA
            </button>
          </div>
        </DrawerFooter>
      </>
    );
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !v && !interactionLocked && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="pb-2 text-center">
            <div className="mb-2 flex justify-center">
              <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-full">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <DrawerTitle className="text-xl font-bold">{title}</DrawerTitle>
            <DrawerDescription className="text-sm">{description}</DrawerDescription>
          </DrawerHeader>

          {renderContent()}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
