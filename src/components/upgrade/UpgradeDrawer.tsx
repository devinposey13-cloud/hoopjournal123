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
import { Check, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';
import { PromoCodeInput } from '@/components/pricing/PromoCodeInput';
import { type PlanId, type BillingCycle, planCatalog, getPlanPrice, track } from '@/lib/plans';
import { useSubscription } from '@/hooks/useSubscription';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

export interface UpgradeDrawerConfig {
  title: string;
  description: string;
  recommendedPlan: PlanId;
  milestone: string;
  benefits: string[];
}

interface UpgradeDrawerProps {
  open: boolean;
  config: UpgradeDrawerConfig | null;
  onClose: () => void;
  onUpgrade: (planId: PlanId) => void;
}

export function UpgradeDrawer({ open, config, onClose, onUpgrade }: UpgradeDrawerProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const { createCheckout } = useSubscription();
  const { isAvailable: rcAvailable, offerings: rcOfferings, purchasePackage } = useRevenueCat();

  if (!config) return null;

  const plan = planCatalog[config.recommendedPlan];
  const price = getPlanPrice(config.recommendedPlan, cycle);

  const handleUpgrade = async () => {
    track('upgrade_clicked', { planId: config.recommendedPlan, cycle, native: isNativeApp() });
    setIsLoading(true);
    try {
      if (isNativeApp() && rcAvailable) {
        const suffix = cycle === 'yearly' ? 'year' : 'month';
        const rcPkg = rcOfferings.find(
          (o) => o.planId === config.recommendedPlan && o.period.toLowerCase().includes(suffix)
        );
        if (rcPkg) {
          await purchasePackage(rcPkg.identifier);
          toast.success('Purchase successful! 🎉');
          onUpgrade(config.recommendedPlan);
        } else {
          toast.error('Package not available');
        }
      } else {
        await createCheckout(config.recommendedPlan, cycle);
        toast.success('Redirecting to checkout...');
        onUpgrade(config.recommendedPlan);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start checkout';
      if (!msg.includes('cancelled') && !msg.includes('canceled')) {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
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
            <DrawerTitle className="text-xl font-bold">{config.title}</DrawerTitle>
            <DrawerDescription className="text-sm">
              {config.description}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-2 space-y-4">
            {/* Billing toggle */}
            <div className="flex justify-center">
              <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
            </div>

            {/* Plan highlight */}
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-foreground">{plan.name}</div>
                  <div className="text-xs text-muted-foreground">{plan.tagline}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-foreground">${price}</div>
                  <div className="text-[10px] text-muted-foreground">
                    /{cycle === 'monthly' ? 'mo' : 'yr'}
                  </div>
                </div>
              </div>

              <ul className="space-y-2">
                {config.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {plan.badge && (
              <div className="flex justify-center">
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  {plan.badge}
                </Badge>
              </div>
            )}

            {/* Promo Code */}
            <PromoCodeInput />
          </div>

          <DrawerFooter className="pt-2">
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full gradient-primary text-primary-foreground font-semibold h-12"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Upgrade to {plan.name}
              {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
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
