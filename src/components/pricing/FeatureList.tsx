import { Check, X } from 'lucide-react';
import type { PlanFeature } from '@/lib/plans';

interface FeatureListProps {
  features: PlanFeature[];
}

export function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="space-y-3">
      {features.map((f) => (
        <li key={f.label} className="flex items-start gap-2.5 text-sm">
          {f.included ? (
            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
          )}
          <span className={f.included ? 'text-foreground' : 'text-muted-foreground/60'}>
            {f.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
