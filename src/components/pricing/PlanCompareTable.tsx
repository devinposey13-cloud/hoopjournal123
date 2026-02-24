import { Check, X } from 'lucide-react';
import { compareFeatures } from '@/lib/plans';
import { cn } from '@/lib/utils';

export function PlanCompareTable() {
  const plans = ['Free', 'Starter', 'Pro', 'Elite'] as const;
  const keys = ['free', 'starter', 'pro', 'elite'] as const;

  const renderCell = (val: string | boolean) => {
    if (val === true) return <Check className="w-4 h-4 text-primary mx-auto" />;
    if (val === false) return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
    return <span className="text-xs text-foreground">{val}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 pr-4 font-semibold text-muted-foreground">Feature</th>
            {plans.map((p) => (
              <th key={p} className={cn(
                'text-center py-3 px-3 font-semibold',
                p === 'Pro' && 'text-primary'
              )}>
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compareFeatures.map((row) => (
            <tr key={row.label} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-3 pr-4 text-muted-foreground">{row.label}</td>
              {keys.map((k) => (
                <td key={k} className={cn(
                  'text-center py-3 px-3',
                  k === 'pro' && 'bg-primary/5'
                )}>
                  {renderCell(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
