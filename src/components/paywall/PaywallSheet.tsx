import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, ArrowRight, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonthlyYearlyToggle } from '@/components/pricing/MonthlyYearlyToggle';
import {
  type PlanId,
  type BillingCycle,
  type PaywallReason,
  planCatalog,
  paywallConfigs,
  getPlanPrice,
  getYearlySavingsPercent,
  getTrialConfig,
  getTrialCopy,
  getTrialCta,
  track,
} from '@/lib/plans';
import { useBilling } from '@/hooks/useBilling';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PaywallSheetProps {
  open: boolean;
  reason: PaywallReason | null;
  currentPlan: PlanId;
  onClose: () => void;
  onUpgrade: (planId: PlanId) => void;
}

const VALUE_BULLETS = [
  { icon: '📊', label: 'Unlimited Game Tracking' },
  { icon: '🧠', label: 'AI Coach Feedback' },
  { icon: '📈', label: 'Performance Trends & Progress' },
  { icon: '🏀', label: 'Advanced Player Analytics' },
  { icon: '🔥', label: 'Shareable Report Cards' },
];

const DYNAMIC_HEADLINES: Partial<Record<PaywallReason, string>> = {
  game_limit: "You've hit your game limit",
  report_card_limit: "You've used all free report cards",
  report_card: 'Your Game Grade is ready',
  pdf_export_limit: 'Unlock Unlimited Game Reports',
};

const PDF_VALUE_BULLETS = [
  { icon: '📄', label: 'Unlimited PDF exports' },
  { icon: '✨', label: 'Clean, professional format' },
  { icon: '🏀', label: 'Share with coaches and recruiters' },
  { icon: '🧠', label: 'Full AI game recap included' },
];

export function PaywallSheet({ open, reason, currentPlan, onClose, onUpgrade }: PaywallSheetProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('elite');
  const { purchasePlan, restorePurchases, isPurchasing, isRestoring, isNative } = useBilling();
  const navigate = useNavigate();
  const config = reason ? paywallConfigs[reason] : null;

  if (!config) return null;

  const isLimitHit = reason === 'game_limit' || reason === 'report_card_limit' || reason === 'pdf_export_limit';
  const isPdfLimit = reason === 'pdf_export_limit';
  const dynamicSubline = DYNAMIC_HEADLINES[reason!] || null;
  const bullets = isPdfLimit ? PDF_VALUE_BULLETS : VALUE_BULLETS;

  const handleUpgrade = async () => {
    track('upgrade_clicked', { planId: selectedPlan, reason, cycle });
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{
              background: 'linear-gradient(180deg, hsl(220 25% 8%) 0%, hsl(220 20% 12%) 100%)',
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* === HERO SECTION === */}
            <div className="relative px-6 pt-10 pb-6 text-center overflow-hidden">
              {/* Glow effect */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: 'hsl(24 100% 50%)' }}
              />

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(24 100% 50%), hsl(35 100% 55%))' }}
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                  Unlock Your Full Game
                </h1>
                <p className="text-white/60 text-sm max-w-xs mx-auto">
                  Track your progress, improve faster, and stand out
                </p>

                {dynamicSubline && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
                    style={{ background: 'hsl(24 100% 50% / 0.15)', border: '1px solid hsl(24 100% 50% / 0.3)' }}
                  >
                    <Lock className="w-3 h-3" style={{ color: 'hsl(24 100% 50%)' }} />
                    <span className="text-xs font-medium" style={{ color: 'hsl(24 100% 65%)' }}>
                      {dynamicSubline}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* === VISUAL PROOF (blurred preview) === */}
            <div className="mx-6 mb-5 rounded-xl overflow-hidden relative" style={{ background: 'hsl(220 20% 14%)' }}>
              <div className="p-4 blur-[2px] opacity-50 select-none pointer-events-none">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg" style={{ background: 'hsl(24 100% 50% / 0.3)' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded-full bg-white/20" />
                    <div className="h-2 w-16 rounded-full bg-white/10" />
                  </div>
                  <div className="text-2xl font-extrabold text-white/30">A</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['PTS', 'REB', 'AST', 'STL'].map((s) => (
                    <div key={s} className="text-center py-2 rounded-lg" style={{ background: 'hsl(220 20% 18%)' }}>
                      <div className="text-xs text-white/30">{s}</div>
                      <div className="text-lg font-bold text-white/20">--</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'hsl(220 20% 10% / 0.9)', border: '1px solid hsl(24 100% 50% / 0.4)' }}>
                  <Lock className="w-3.5 h-3.5" style={{ color: 'hsl(24 100% 50%)' }} />
                  <span className="text-xs font-semibold text-white">Upgrade to unlock full breakdown</span>
                </div>
              </div>
            </div>

            {/* === VALUE STACK === */}
            <div className="px-6 mb-5">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                Everything you unlock
              </p>
              <div className="space-y-2.5">
                {bullets.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-base">{b.icon}</span>
                    <span className="text-sm text-white/80">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* === PLAN OPTIONS === */}
            <div className="px-6 mb-4">
              <div className="flex justify-center mb-4">
                <MonthlyYearlyToggle cycle={cycle} onChange={setCycle} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(['pro', 'elite'] as PlanId[]).map((id) => {
                  const plan = planCatalog[id];
                  const price = getPlanPrice(id, cycle);
                  const savings = cycle === 'yearly' ? getYearlySavingsPercent(id) : 0;
                  const isSelected = selectedPlan === id;
                  const isElite = id === 'elite';

                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedPlan(id)}
                      className={cn(
                        'relative rounded-2xl p-4 text-left transition-all duration-200',
                        isSelected
                          ? 'ring-2'
                          : 'ring-1 ring-white/10 hover:ring-white/20',
                      )}
                      style={{
                        background: isSelected
                          ? isElite
                            ? 'linear-gradient(135deg, hsl(24 100% 50% / 0.15), hsl(35 100% 55% / 0.08))'
                            : 'hsl(220 20% 16%)'
                          : 'hsl(220 20% 12%)',
                        ...(isSelected ? { '--tw-ring-color': isElite ? 'hsl(24 100% 50%)' : 'hsl(220 60% 60%)' } as any : {}),
                      }}
                    >
                      {isElite && (
                        <Badge
                          className="absolute -top-2.5 right-3 text-[9px] px-2 py-0.5 border-0"
                          style={{
                            background: 'linear-gradient(135deg, hsl(24 100% 50%), hsl(35 100% 55%))',
                            color: 'white',
                          }}
                        >
                          Most Popular
                        </Badge>
                      )}

                      <div className="text-xs font-semibold text-white/60 mb-1">{plan.name}</div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-2xl font-extrabold text-white">${price}</span>
                        <span className="text-[10px] text-white/40">/{cycle === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      {savings > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 mb-2 border-green-500/30 text-green-400">
                          Save {savings}%
                        </Badge>
                      )}
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        {id === 'pro'
                          ? 'For players consistently working on their game'
                          : 'For serious players who want to stand out'}
                      </p>

                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: isElite ? 'hsl(24 100% 50%)' : 'hsl(220 60% 60%)' }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* === CTA SECTION === */}
            <div className="px-6 pb-2">
              <Button
                onClick={handleUpgrade}
                disabled={isPurchasing}
                className="w-full h-13 text-base font-bold rounded-xl border-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(24 100% 50%), hsl(35 100% 55%))',
                  color: 'white',
                  boxShadow: '0 4px 20px hsl(24 100% 50% / 0.4)',
                }}
              >
                {isPurchasing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isPurchasing ? 'Processing...' : `Upgrade to ${planCatalog[selectedPlan].name}`}
                {!isPurchasing && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>

              <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-white/40">
                <span>Cancel anytime</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>No commitment</span>
              </div>
            </div>

            {/* === TRUST === */}
            <div className="px-6 py-3 text-center">
              <p className="text-[10px] text-white/30">
                Built for players and parents
              </p>
            </div>

            {/* === RESTORE + LEGAL FOOTER === */}
            <div className="px-6 pb-8 flex flex-col items-center gap-2">
              {isNative && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="text-white/30 hover:text-white/50 text-[11px] h-8"
                >
                  {isRestoring ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                  Restore Purchases
                </Button>
              )}

              <div className="flex items-center gap-3 text-[10px] text-white/25">
                <button onClick={() => { onClose(); navigate('/terms'); }} className="hover:text-white/40 transition-colors">
                  Terms of Service
                </button>
                <span>·</span>
                <button onClick={() => { onClose(); navigate('/privacy'); }} className="hover:text-white/40 transition-colors">
                  Privacy Policy
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
