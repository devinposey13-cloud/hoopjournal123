import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PostGameInsight } from '@/utils/postGameInsights';
import { Target, Shield, Star, TrendingUp, Trophy, Flame, Lightbulb, Zap } from 'lucide-react';

interface InsightCardProps {
  insight: PostGameInsight;
  compact?: boolean;
  animate?: boolean;
  delay?: number;
  className?: string;
  onView?: () => void;
  isNew?: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  career_high: <Trophy className="w-4 h-4" />,
  efficiency: <Target className="w-4 h-4" />,
  playmaking: <Zap className="w-4 h-4" />,
  defensive_impact: <Shield className="w-4 h-4" />,
  all_around: <Star className="w-4 h-4" />,
  above_average: <TrendingUp className="w-4 h-4" />,
  bounce_back: <TrendingUp className="w-4 h-4" />,
  consistency: <Flame className="w-4 h-4" />,
  fallback: <Lightbulb className="w-4 h-4" />,
};

export function InsightCard({
  insight,
  compact = false,
  animate = true,
  delay = 0,
  className,
  onView,
  isNew,
}: InsightCardProps) {
  const Wrapper = animate ? motion.div : 'div';
  const animateProps = animate
    ? {
        initial: { y: 12, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { delay, duration: 0.4 },
      }
    : {};

  if (compact) {
    return (
      <Wrapper
        {...(animateProps as any)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
          'bg-primary/5 border border-primary/15',
          className
        )}
        onClick={onView}
      >
        <span className="text-primary shrink-0">{TYPE_ICONS[insight.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{insight.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{insight.body}</p>
        </div>
        {isNew && (
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
            New
          </span>
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      {...(animateProps as any)}
      className={cn(
        'relative overflow-hidden rounded-xl p-4',
        'bg-gradient-to-br from-primary/8 via-card to-accent/5',
        'border border-primary/15',
        className
      )}
      onClick={onView}
    >
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-primary">{TYPE_ICONS[insight.type]}</span>
          <span className="text-sm font-bold">{insight.title}</span>
          {isNew && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{insight.body}</p>

        {insight.statCallout && (
          <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-xs font-bold text-primary">{insight.statCallout}</span>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
