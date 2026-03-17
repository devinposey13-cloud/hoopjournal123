/**
 * NativePurchaseSheet — now uses Despia billing instead of RevenueCat Capacitor plugin.
 * Simplified since Despia handles the native purchase UI.
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
import { Check, ArrowRight, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { FeatureList } from '@/components/pricing/FeatureList';
import { type BillingCycle, type PlanId, planCatalog, planOrder, getPlanPrice } from '@/lib/plans';
import { useBilling } from '@/hooks/useBilling';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { purchasePlan, restorePurchases, isPurchasing, isRestoring } = useBilling();
  const [cycle, setCycle] = useState<BillingCycle>(initialBillingCycle);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(recommendedPlan);

  useEffect(() => {
    if (!open) return;
    setSelectedPlan(recommendedPlan);
    setCycle(initialBillingCycle);
  }, [open, recommendedPlan, initialBillingCycle]);

  const tiers = planOrder.filter((id) => id !== 'free') as PlanId[];

  const handlePurchase = async () => {
    try {
      await purchasePlan(selectedPlan, cycle);
      onPurchaseComplete?.(selectedPlan);
      onClose();
    } catch {
      // Error handled by useBilling
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

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <DrawerTitle className="text-xl font-bold">{title}</DrawerTitle>
            <DrawerDescription className="text-sm">{description}</DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-2 space-y-4">
            <div className="flex justify-center">
              <div className="inline-flex rounded-full bg-muted p-1 gap-1">
                <button
                  onClick={() => setCycle('monthly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                    cycle === 'monthly'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setCycle('yearly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                    cycle === 'yearly'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {tiers.map((id) => {
                const plan = planCatalog[id];
                const price = getPlanPrice(id, cycle);
                const isRecommended = id === recommendedPlan;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedPlan(id)}
                    className={cn(
                      'flex-1 rounded-xl border-2 p-3 text-center transition-all duration-200',
                      selectedPlan === id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="text-xs font-semibold mb-1">{plan.name}</div>
                    <div className="text-lg font-extrabold">${price}</div>
                    <div className="text-[10px] text-muted-foreground">
                      /{cycle === 'monthly' ? 'mo' : 'yr'}
                    </div>
                    {isRecommended && (
                      <Badge className="mt-1.5 text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                        Recommended
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                What you get with {planCatalog[selectedPlan].name}
              </p>
              <FeatureList features={planCatalog[selectedPlan].features.filter((f) => f.included)} />
            </div>
          </div>

          <DrawerFooter className="pt-2">
            <Button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="w-full gradient-primary text-primary-foreground font-semibold h-12"
            >
              {isPurchasing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Subscribe — ${getPlanPrice(selectedPlan, cycle)}/{cycle === 'monthly' ? 'mo' : 'yr'}
              {!isPurchasing && <ArrowRight className="w-4 h-4 ml-2" />}
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
              <Button variant="ghost" className="text-muted-foreground">
                Not now
              </Button>
            </DrawerClose>
            <p className="text-center text-[10px] text-muted-foreground mt-1">
              Cancel anytime. Your data stays yours.
            </p>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
