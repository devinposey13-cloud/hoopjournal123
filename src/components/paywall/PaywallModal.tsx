import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';
import { FeatureList } from '@/components/pricing/FeatureList';
import { Separator } from '@/components/ui/separator';
import { Lock, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import {
  type PlanId,
  type BillingCycle,
  type PaywallReason,
  planCatalog,
  paywallConfigs,
  planOrder,
  getPlanPrice,
  track,
} from '@/lib/plans';
import { useBilling } from '@/hooks/useBilling';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PaywallModalProps {
  open: boolean;
  reason: PaywallReason | null;
  currentPlan: PlanId;
  onClose: () => void;
  onUpgrade: (planId: PlanId) => void;
}

export function PaywallModal({ open, reason, currentPlan, onClose, onUpgrade }: PaywallModalProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const config = reason ? paywallConfigs[reason] : null;
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(config?.recommendedPlan || 'pro');
  const { purchasePlan, restorePurchases, isPurchasing, isRestoring, isNative } = useBilling();

  if (!config) return null;

  const upgradePlans = planOrder.filter(
    (id) => id !== 'free' && planOrder.indexOf(id) > planOrder.indexOf(currentPlan)
  );

  const handleUpgrade = async () => {
    track('plan_selected', { planId: selectedPlan, billingCycle: cycle });
    track('upgrade_clicked', { planId: selectedPlan, reason: reason });
    try {
      await purchasePlan(selectedPlan, cycle);
      track('upgrade_completed', { planId: selectedPlan, billingCycle: cycle });
      onUpgrade(selectedPlan);
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

  // Value bullets for limit-hit scenarios
  const isLimitHit = reason === 'game_limit' || reason === 'report_card_limit';
  const valueBullets = isLimitHit ? [
    'Unlimited game logs',
    'Full report cards & sharing',
    'Performance analytics',
    'AI Coach insights',
  ] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        {/* Header */}
        <div className="gradient-primary p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">
              {isLimitHit ? "You've reached your free limit" : config.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-primary-foreground/80 text-sm">
            {isLimitHit
              ? 'Upgrade to continue tracking your progress and unlock your full potential.'
              : config.description}
          </DialogDescription>
        </div>

        <DialogHeader className="sr-only">
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Billing toggle */}
          <div className="flex justify-center">
            <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
          </div>

          {/* Plan pills */}
          <div className="flex gap-2">
            {upgradePlans.map((id) => {
              const plan = planCatalog[id];
              const price = getPlanPrice(id, cycle);
              const isRecommended = id === config.recommendedPlan;
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

          {/* Features preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              What you get with {planCatalog[selectedPlan].name}
            </p>
            <FeatureList features={planCatalog[selectedPlan].features.filter(f => f.included)} />
          </div>

          <Separator />

          {/* CTA */}
          <Button
            className="w-full gradient-primary text-primary-foreground font-semibold h-12"
            onClick={handleUpgrade}
            disabled={isPurchasing}
          >
            {isPurchasing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Upgrade to {planCatalog[selectedPlan].name}
            {!isPurchasing && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>

          {isNative && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-xs"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
              Restore Purchases
            </Button>
          )}

          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
            Not now
          </Button>

          {/* Trust footer */}
          <p className="text-center text-xs text-muted-foreground">
            Cancel anytime. Your data stays yours.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
