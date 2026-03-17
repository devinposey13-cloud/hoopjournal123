import { AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlanState';
import { cn } from '@/lib/utils';

export function FreeLimitBanner() {
  const {
    currentPlan,
    freeGamesRemaining,
    freeReportCardsRemaining,
    openPaywall,
  } = usePlan();

  // Only show for free users
  if (currentPlan !== 'free') return null;

  const gamesAtLimit = freeGamesRemaining === 0;
  const reportsAtLimit = freeReportCardsRemaining === 0;
  const gamesWarning = freeGamesRemaining === 1;
  const reportsWarning = freeReportCardsRemaining === 1;

  // Nothing to show
  if (!gamesAtLimit && !reportsAtLimit && !gamesWarning && !reportsWarning) return null;

  const isHardLimit = gamesAtLimit || reportsAtLimit;

  const messages: string[] = [];
  if (gamesAtLimit) messages.push("You've used all 3 free games");
  else if (gamesWarning) messages.push('1 free game remaining');
  if (reportsAtLimit) messages.push("You've used all 3 free report cards");
  else if (reportsWarning) messages.push('1 free report card remaining');

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 flex items-center gap-3 transition-all',
        isHardLimit
          ? 'bg-destructive/10 border-destructive/30'
          : 'bg-amber-500/10 border-amber-500/30'
      )}
    >
      {isHardLimit ? (
        <Lock className="w-4 h-4 text-destructive shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          isHardLimit ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
        )}>
          {messages.join(' · ')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upgrade for unlimited access
        </p>
      </div>
      <Button
        size="sm"
        className="gradient-primary text-primary-foreground text-xs shrink-0"
        onClick={() => openPaywall(gamesAtLimit ? 'game_limit' : reportsAtLimit ? 'report_card_limit' : 'game_limit')}
      >
        Upgrade <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}
