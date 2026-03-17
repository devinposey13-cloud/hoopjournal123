import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureList } from './FeatureList';
import { cn } from '@/lib/utils';
import { type Plan, type BillingCycle, getPlanPrice, getYearlySavingsPercent, type PlanId, track, getTrialConfig, getTrialCopy, getTrialCta } from '@/lib/plans';

interface PlanCardProps {
  plan: Plan;
  cycle: BillingCycle;
  currentPlan?: PlanId;
  onSelect: (planId: PlanId) => void;
  promoApplied?: boolean;
  /** When provided (e.g. from RevenueCat), displayed instead of the computed price */
  nativePriceString?: string;
}

export function PlanCard({ plan, cycle, currentPlan, onSelect, promoApplied, nativePriceString }: PlanCardProps) {
  const originalPrice = getPlanPrice(plan.id, cycle);
  const price = (promoApplied && plan.id !== 'free') ? getPlanPrice('pro', cycle) : originalPrice;
  const savings = getYearlySavingsPercent(plan.id);
  const isCurrent = currentPlan === plan.id;
  const isHighlighted = plan.highlighted;
  const trial = getTrialConfig(plan.id, cycle);
  const trialCopy = getTrialCopy(plan.id, cycle);
  const trialCta = getTrialCta(plan.id, cycle);

  const handleClick = () => {
    track('upgrade_clicked', { planId: plan.id, hasTrial: trial.hasTrial });
    if (trial.hasTrial) {
      track('trial_offer_viewed', { planId: plan.id, cycle, trialDays: trial.trialDays });
    }
    onSelect(plan.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-lg">
            Most Popular
          </Badge>
        </div>
      )}
      <Card
        className={cn(
          'h-full flex flex-col transition-all duration-300 hover:shadow-lg',
          isHighlighted && 'border-2 border-primary shadow-glow ring-1 ring-primary/20',
          isCurrent && 'ring-2 ring-primary/50'
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{plan.name}</h3>
            {plan.badge && !isHighlighted && (
              <Badge variant="secondary" className="text-[10px]">
                {plan.badge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{plan.tagline}</p>
          {plan.helperText && (
            <p className="text-xs text-muted-foreground/70 mt-1 italic">{plan.helperText}</p>
          )}
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              {nativePriceString ? (
                <>
                  <span className="text-4xl font-extrabold tracking-tight">
                    {nativePriceString}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    /{cycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-extrabold tracking-tight">
                    ${price === 0 ? '0' : price}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground text-sm">
                      /{cycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                  {price === 0 && (
                    <span className="text-muted-foreground text-sm">/forever</span>
                  )}
                </>
              )}
            </div>
            {cycle === 'yearly' && savings > 0 && (
              <p className="text-xs text-primary mt-1 font-medium">
                Save {savings}% vs monthly
              </p>
            )}
            {trialCopy && (
              <p className="text-xs text-primary mt-1.5 font-medium">
                {trialCopy}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-6">
          <FeatureList features={plan.features} />
        </CardContent>

        <CardFooter>
          {isCurrent ? (
            <Badge variant="secondary" className="w-full justify-center py-2.5 text-sm">
              Current Plan
            </Badge>
          ) : (
            <Button
              className={cn(
                'w-full font-semibold',
                isHighlighted && 'gradient-primary shadow-glow hover:opacity-90'
              )}
              variant={isHighlighted ? 'default' : 'outline'}
              onClick={handleClick}
            >
              {plan.id === 'free' ? plan.cta : `Upgrade to ${plan.name}`}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
