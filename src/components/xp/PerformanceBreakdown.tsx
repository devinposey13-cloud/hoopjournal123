import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PerformanceBreakdownItem } from '@/types/xp';

interface PerformanceBreakdownProps {
  breakdown: PerformanceBreakdownItem[];
  className?: string;
}

export function PerformanceBreakdown({ breakdown, className }: PerformanceBreakdownProps) {
  // Sort by absolute contribution (highest impact first)
  const sortedBreakdown = [...breakdown].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  const maxContribution = Math.max(...breakdown.map(b => Math.abs(b.contribution)));

  return (
    <div className={cn('space-y-3', className)}>
      <h4 className="text-sm font-semibold text-muted-foreground">Performance Breakdown</h4>
      
      <div className="space-y-2">
        {sortedBreakdown.map((item, index) => (
          <motion.div
            key={item.stat}
            className="space-y-1"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>{item.stat}</span>
                <span className="text-muted-foreground">
                  ({item.value} × {item.weight > 0 ? '+' : ''}{item.weight})
                </span>
              </span>
              <span className={cn(
                'font-medium',
                item.contribution > 0 ? 'text-green-500' : item.contribution < 0 ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {item.contribution > 0 ? '+' : ''}{item.contribution.toFixed(1)}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  item.contribution > 0 ? 'bg-green-500' : item.contribution < 0 ? 'bg-red-500' : 'bg-muted-foreground'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${(Math.abs(item.contribution) / maxContribution) * 100}%` }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
