import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
  type BillingCycle,
  type PlanId,
  planCatalog,
  planOrder,
  getPlanPrice,
  getYearlySavingsPercent,
  track,
} from '@/lib/plans';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingPreviewCardProps {
  onSelectFree: () => void;
  onSelectPaid: (planId: PlanId, billingCycle: BillingCycle) => void;
}

const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  free: ['Game logging (30 days)', 'Basic XP & Leveling', '2 AI Recaps/mo'],
  starter: ['Unlimited history', 'Full XP leveling', '4 AI Recaps/mo', 'Goals & streaks'],
  pro: ['Unlimited AI recaps', 'Advanced analytics', 'AI dev plan'],
  elite: ['Recruiting profile', 'PDF reports', 'Parent dashboard'],
};

const PLAN_PROMO_BADGE: Partial<Record<PlanId, string>> = {
  starter: 'Eligible for Elite (with event code)',
  elite: 'Unlockable via event code',
};

export function PricingPreviewCard({ onSelectFree, onSelectPaid }: PricingPreviewCardProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('free');
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: promoCode.trim() },
      });
      if (error) throw error;
      if (data?.valid) {
        setPromoApplied(true);
        toast.success('Code applied! Subscribe to Starter to lock in Elite access.');
        track('promo_code_applied', { code: promoCode.trim(), source: 'onboarding' });
      } else {
        toast.error(data?.message || 'Invalid code. Please try again.');
      }
    } catch (err) {
      toast.error('Failed to validate code. Try again.');
    } finally {
      setPromoValidating(false);
    }
  };

  const handleContinue = async () => {
    track('onboarding_plan_selected', { planId: selectedPlan, cycle });

    if (selectedPlan === 'free') {
      onSelectFree();
      return;
    }

    // Paid plan → redirect to Stripe
    setLoadingCheckout(true);
    try {
      onSelectPaid(selectedPlan, cycle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoadingCheckout(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-4 max-h-[80vh] overflow-y-auto"
    >
      <h2 className="text-2xl md:text-3xl mb-2 text-foreground font-semibold">
        Choose your plan
      </h2>
      <p className="text-muted-foreground mb-3 text-sm">
        Start free. Upgrade when you're ready. No credit card required for Free.
      </p>

      {/* AAU Promo Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-lg mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3"
      >
        <div className="flex items-center gap-2 justify-center mb-1">
          <span className="text-lg">🏀</span>
          <span className="font-bold text-sm text-foreground">AAU EVENT SPECIAL</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the event code at checkout to unlock <strong className="text-foreground">ELITE features</strong> for the <strong className="text-foreground">STARTER price</strong>.
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Valid for event attendees. Must complete Starter subscription.
        </p>
      </motion.div>

      {/* Billing toggle */}
      <div className="mb-4">
        <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
      </div>

      {/* Plan cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg mb-3">
        {planOrder.map((id, i) => {
          const plan = planCatalog[id];
          const price = getPlanPrice(id, cycle);
          const savings = getYearlySavingsPercent(id);
          const isSelected = selectedPlan === id;
          const promoBadge = PLAN_PROMO_BADGE[id];

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
            >
              <Card
                onClick={() => setSelectedPlan(id)}
                className={`p-3 cursor-pointer transition-all duration-200 hover:border-primary/50 relative h-full ${
                  isSelected
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border-border'
                } ${plan.highlighted ? 'ring-1 ring-primary/20' : ''}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-2 right-2 text-[9px] px-1.5 py-0 gradient-primary text-primary-foreground border-0">
                    {plan.badge}
                  </Badge>
                )}
                {promoBadge && promoApplied && (
                  <Badge variant="outline" className="absolute -top-2 left-2 text-[8px] px-1 py-0 border-primary/40 text-primary bg-background">
                    {promoBadge}
                  </Badge>
                )}
                <div className="text-left">
                  <div className="text-sm font-bold text-foreground">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-extrabold text-foreground">
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        /{cycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                    {cycle === 'yearly' && savings > 0 && (
                      <Badge variant="outline" className="text-[8px] ml-0.5 border-primary/30 text-primary px-1 py-0">
                        -{savings}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">{plan.tagline}</p>
                  <ul className="space-y-1">
                    {PLAN_HIGHLIGHTS[id].map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                        <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Have a code? */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-lg mb-4"
      >
        <button
          onClick={() => setShowPromoInput(!showPromoInput)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Have an Event Code?
          {showPromoInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showPromoInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-2 mt-2 max-w-xs mx-auto"
          >
            <Input
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              disabled={promoApplied}
              className="text-sm h-9"
            />
            <Button
              size="sm"
              onClick={handleValidatePromo}
              disabled={promoValidating || promoApplied || !promoCode.trim()}
              className="h-9 px-3"
            >
              {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : promoApplied ? '✓' : 'Apply'}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* CTA */}
      <div className="w-full max-w-sm space-y-2">
        <Button
          onClick={handleContinue}
          disabled={loadingCheckout}
          className="w-full h-12 text-base gradient-primary"
        >
          {loadingCheckout ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          {selectedPlan === 'free'
            ? 'Start with Free'
            : `Go ${planCatalog[selectedPlan].name}`}
        </Button>

        {selectedPlan !== 'free' && (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedPlan('free');
            }}
            className="w-full text-sm text-muted-foreground"
          >
            Start with Free instead
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 mb-4">
        Cancel anytime. Your data stays yours.
      </p>
    </motion.div>
  );
}
