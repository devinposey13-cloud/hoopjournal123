import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Check, Sparkles } from 'lucide-react';
import { type BillingCycle, planCatalog, getPlanPrice, getYearlySavingsPercent, track } from '@/lib/plans';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';

interface PricingPreviewCardProps {
  onSelectFree: () => void;
  onSelectStarter: () => void;
}

export function PricingPreviewCard({ onSelectFree, onSelectStarter }: PricingPreviewCardProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter'>('free');

  const free = planCatalog.free;
  const starter = planCatalog.starter;
  const starterPrice = getPlanPrice('starter', cycle);
  const starterSavings = getYearlySavingsPercent('starter');

  const handleContinue = () => {
    track('onboarding_plan_selected', { planId: selectedPlan });
    if (selectedPlan === 'starter') {
      onSelectStarter();
    } else {
      onSelectFree();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6"
    >
      <h2 className="text-2xl md:text-3xl mb-2 text-foreground font-semibold">
        Start free. Upgrade when you're ready.
      </h2>

      <p className="text-muted-foreground mb-4 text-sm">
        No credit card required.
      </p>

      {/* Billing toggle */}
      <div className="mb-5">
        <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md mb-4">
        {/* Free card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            onClick={() => setSelectedPlan('free')}
            className={`p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 ${
              selectedPlan === 'free'
                ? 'border-2 border-primary bg-primary/5'
                : 'border-border'
            }`}
          >
            <div className="text-left">
              <div className="text-lg font-bold text-foreground">{free.name}</div>
              <div className="text-2xl font-extrabold text-foreground mt-1">$0</div>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{free.tagline}</p>
              <ul className="space-y-1.5">
                {['Game logging (30 days)', 'Basic XP & Leveling', '2 AI Recaps/mo', 'Dashboard stats'].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </motion.div>

        {/* Starter card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            onClick={() => setSelectedPlan('starter')}
            className={`p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 relative ${
              selectedPlan === 'starter'
                ? 'border-2 border-primary bg-primary/5'
                : 'border-border'
            }`}
          >
            <Badge className="absolute -top-2.5 right-3 text-[10px] px-2 py-0.5 gradient-primary text-primary-foreground border-0">
              {starter.badge}
            </Badge>
            <div className="text-left">
              <div className="text-lg font-bold text-foreground">{starter.name}</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-extrabold text-foreground">${starterPrice}</span>
                <span className="text-xs text-muted-foreground">/{cycle === 'monthly' ? 'mo' : 'yr'}</span>
                {cycle === 'yearly' && starterSavings > 0 && (
                  <Badge variant="outline" className="text-[9px] ml-1 border-primary/30 text-primary">
                    Save {starterSavings}%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{starter.tagline}</p>
              <ul className="space-y-1.5">
                {['Unlimited history', 'Full XP leveling', '4 AI Recaps/mo', 'Pregame Talk weekly', 'Goals & streaks'].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Pro/Elite teaser */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-muted-foreground mb-5 flex items-center gap-1.5 max-w-xs"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        Competitive player? Pro and Elite unlock deeper analytics and recruiting tools anytime.
      </motion.p>

      {/* CTAs */}
      <div className="w-full max-w-sm space-y-2">
        <Button
          onClick={handleContinue}
          className="w-full h-12 text-base gradient-primary"
        >
          {selectedPlan === 'free' ? 'Start with Free' : 'Go Starter'}
        </Button>

        {selectedPlan === 'starter' && (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedPlan('free');
              onSelectFree();
            }}
            className="w-full text-sm text-muted-foreground"
          >
            Start with Free instead
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3">
        Cancel anytime. Your data stays yours.
      </p>
    </motion.div>
  );
}
