import { useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Check, ArrowRight, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { FeatureList } from '@/components/pricing/FeatureList';
import { type PlanId, planCatalog, planOrder } from '@/lib/plans';
import { useRevenueCat, type RCPackage } from '@/hooks/useRevenueCat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NativePurchaseSheetProps {
  open: boolean;
  onClose: () => void;
  onPurchaseComplete?: (planId: PlanId) => void;
  title?: string;
  description?: string;
  recommendedPlan?: PlanId;
}

export function NativePurchaseSheet({
  open,
  onClose,
  onPurchaseComplete,
  title = 'Upgrade Your Game',
  description = 'Unlock premium features with a subscription.',
  recommendedPlan = 'pro',
}: NativePurchaseSheetProps) {
  const { offerings, isLoading, purchasePackage, restorePurchases } = useRevenueCat();
  const [cycle, setCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(recommendedPlan);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const filteredOfferings = offerings.filter((o) => o.period === cycle);

  const tiers = planOrder.filter((id) => id !== 'free') as PlanId[];

  const getPackageForPlan = (planId: PlanId): RCPackage | undefined =>
    filteredOfferings.find((o) => o.planId === planId);

  const selectedPackage = getPackageForPlan(selectedPlan);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setIsPurchasing(true);
    try {
      await purchasePackage(selectedPackage.identifier);
      toast.success('Purchase successful! 🎉');
      onPurchaseComplete?.(selectedPlan);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      if (!msg.includes('cancelled') && !msg.includes('canceled')) {
        toast.error(msg);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      toast.success('Purchases restored!');
    } catch (err) {
      toast.error('Failed to restore purchases');
    } finally {
      setIsRestoring(false);
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
            {/* Billing toggle */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-full bg-muted p-1 gap-1">
                <button
                  onClick={() => setCycle('Monthly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                    cycle === 'Monthly'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setCycle('Yearly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                    cycle === 'Yearly'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Yearly
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredOfferings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Packages unavailable. Please try again later.
              </div>
            ) : (
              <>
                {/* Plan pills */}
                <div className="flex gap-2">
                  {tiers.map((id) => {
                    const pkg = getPackageForPlan(id);
                    if (!pkg) return null;
                    const plan = planCatalog[id];
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
                        <div className="text-lg font-extrabold">{pkg.priceString}</div>
                        <div className="text-[10px] text-muted-foreground">
                          /{cycle === 'Monthly' ? 'mo' : 'yr'}
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

                {/* Features preview */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    What you get with {planCatalog[selectedPlan].name}
                  </p>
                  <FeatureList features={planCatalog[selectedPlan].features.filter((f) => f.included)} />
                </div>
              </>
            )}
          </div>

          <DrawerFooter className="pt-2">
            <Button
              onClick={handlePurchase}
              disabled={isPurchasing || !selectedPackage}
              className="w-full gradient-primary text-primary-foreground font-semibold h-12"
            >
              {isPurchasing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {selectedPackage
                ? `Subscribe — ${selectedPackage.priceString}/${cycle === 'Monthly' ? 'mo' : 'yr'}`
                : 'Select a plan'}
              {!isPurchasing && selectedPackage && <ArrowRight className="w-4 h-4 ml-2" />}
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
