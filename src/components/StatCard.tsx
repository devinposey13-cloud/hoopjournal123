import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  suffix?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, suffix, className }: StatCardProps) {
  return (
    <div 
      className={cn(
        'stat-card transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5',
        'hover:border-primary/30 hover:-translate-y-0.5',
        'cursor-default',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 transition-colors duration-300 group-hover:text-foreground/80">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground transition-transform duration-300">
              {value}
            </span>
            {suffix && (
              <span className="text-sm text-muted-foreground">{suffix}</span>
            )}
          </div>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10 transition-all duration-300 hover:bg-primary/20 hover:scale-110">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium transition-colors duration-300',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '—'}
          </span>
        </div>
      )}
    </div>
  );
}
