import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BillingCycle } from '@/lib/plans';

interface MonthlyYearlyToggleProps {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}

export function MonthlyYearlyToggle({ cycle, onChange }: MonthlyYearlyToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-secondary p-1">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          'rounded-full px-5 py-2 text-sm font-medium transition-all duration-200',
          cycle === 'monthly'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('yearly')}
        className={cn(
          'rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2',
          cycle === 'yearly'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Yearly
        <Badge variant="secondary" className={cn(
          'text-[10px] px-1.5 py-0',
          cycle === 'yearly' ? 'bg-primary-foreground/20 text-primary-foreground' : ''
        )}>
          Save ~15%
        </Badge>
      </button>
    </div>
  );
}
