import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Target, Trophy, TrendingUp, TrendingDown, Percent, Circle, Flame, Footprints, Timer, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TRUST_BAND_COLORS, type TrustBand } from '@/utils/coachTrust';
import type { GameStats } from '@/types/basketball';

interface PracticeSession {
  id: string;
  created_at: string;
  practice_type: string;
  ft_made: number;
  ft_attempted: number;
  midrange_made: number;
  midrange_attempted: number;
  three_pt_made: number;
  three_pt_attempted: number;
}

interface ConditioningSession {
  id: string;
  created_at: string;
  activity_type: string;
  elapsed_seconds: number | null;
  total_distance_meters: number | null;
  coach_trust_score: number | null;
  coach_trust_band: string | null;
  is_manual: boolean;
  verification_status: string;
}

interface PracticeProgressViewProps {
  sessions: PracticeSession[];
  games?: GameStats[];
  mode: 'practice' | 'combined';
  conditioningSessions?: ConditioningSession[];
}

function pct(made: number, att: number): number {
  return att > 0 ? Math.round((made / att) * 100) : 0;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPace(seconds: number, meters: number): string {
  if (meters <= 0 || seconds <= 0) return '--';
  const km = meters / 1000;
  const paceSeconds = seconds / km;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function StatCard({ label, value, suffix = '%', icon, variant = 'default', delay = 0, subLabel }: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning';
  delay?: number;
  subLabel?: string;
}) {
  const styles = {
    default: 'bg-card border-border',
    accent: 'bg-primary/5 border-primary/20',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.2 }}
      className={cn('p-4 rounded-xl border shadow-sm', styles[variant])}
    >
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">
        <AnimatedCounter value={value} decimals={0} delay={delay} suffix={suffix} />
      </p>
      {subLabel && <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>}
    </motion.div>
  );
}

function GapCard({ label, practiceVal, gameVal, delay = 0 }: {
  label: string;
  practiceVal: number;
  gameVal: number;
  delay?: number;
}) {
  const diff = practiceVal - gameVal;
  const isPositive = diff >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-4 rounded-xl border bg-card shadow-sm"
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Practice</p>
          <p className="text-lg font-bold">{practiceVal}%</p>
        </div>
        <div className="text-center px-2">
          <div className={cn(
            'flex items-center gap-1 text-sm font-semibold',
            isPositive ? 'text-green-500' : 'text-red-500'
          )}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(diff)}%
          </div>
          <p className="text-[10px] text-muted-foreground">gap</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Game</p>
          <p className="text-lg font-bold">{gameVal}%</p>
        </div>
      </div>
    </motion.div>
  );
}

function ConditioningSection({ sessions }: { sessions: ConditioningSession[] }) {
  const totals = useMemo(() => {
    let totalDist = 0, totalTime = 0, count = 0;
    sessions.forEach(s => {
      totalDist += s.total_distance_meters || 0;
      totalTime += s.elapsed_seconds || 0;
      count++;
    });
    return { totalDist, totalTime, count };
  }, [sessions]);

  const avgTrustScore = useMemo(() => {
    const scored = sessions.filter(s => s.coach_trust_score != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, s) => sum + (s.coach_trust_score || 0), 0) / scored.length);
  }, [sessions]);

  const bestRun = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions.reduce((best, s) => {
      const dist = s.total_distance_meters || 0;
      const bestDist = best.total_distance_meters || 0;
      return dist > bestDist ? s : best;
    });
  }, [sessions]);

  const last5Data = useMemo(() => {
    const sorted = [...sessions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .reverse();

    return sorted.map(s => {
      const dist = (s.total_distance_meters || 0) / 1000;
      return {
        date: format(new Date(s.created_at), 'MMM d'),
        distance: Math.round(dist * 100) / 100,
        pace: s.elapsed_seconds && s.total_distance_meters
          ? Math.round((s.elapsed_seconds / (s.total_distance_meters / 1000)) / 60 * 10) / 10
          : 0,
      };
    });
  }, [sessions]);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Footprints className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Conditioning</h3>
        {avgTrustScore != null && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            avgTrustScore >= 90 ? 'bg-green-500/15 text-green-400' :
            avgTrustScore >= 70 ? 'bg-yellow-500/15 text-yellow-400' :
            'bg-orange-500/15 text-orange-400'
          )}>
            <Shield className="h-3 w-3 inline mr-1" />
            Avg Trust {avgTrustScore}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Runs"
          value={totals.count}
          suffix=""
          icon={<Footprints className="h-4 w-4" />}
          variant="default"
          delay={0}
        />
        <StatCard
          label="Distance"
          value={Math.round(totals.totalDist / 100) / 10}
          suffix=" km"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="accent"
          delay={0.05}
          subLabel={`${Math.round(totals.totalDist)} m total`}
        />
        <StatCard
          label="Time"
          value={Math.round(totals.totalTime / 60)}
          suffix=" min"
          icon={<Timer className="h-4 w-4" />}
          variant="default"
          delay={0.1}
        />
        <StatCard
          label="Avg Pace"
          value={0}
          suffix=""
          icon={<Flame className="h-4 w-4" />}
          variant="warning"
          delay={0.15}
          subLabel={totals.totalDist > 0 ? `${formatPace(totals.totalTime, totals.totalDist)} /km` : '--'}
        />
      </div>

      {bestRun && (bestRun.total_distance_meters || 0) > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-3 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Best Run:</span>{' '}
              {format(new Date(bestRun.created_at), 'MMM d')} —{' '}
              {((bestRun.total_distance_meters || 0) / 1000).toFixed(2)} km
              {bestRun.elapsed_seconds ? ` in ${formatDuration(bestRun.elapsed_seconds)}` : ''}
            </div>
          </CardContent>
        </Card>
      )}

      {last5Data.length >= 2 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <h3 className="font-semibold text-base">Last 5 Runs</h3>
            <p className="text-xs text-muted-foreground">Distance trend (km)</p>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <ChartContainer
              config={{ distance: { label: 'Distance', color: 'hsl(var(--primary))' } }}
              className="h-[200px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last5Data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="condGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="font-bold">{d.distance} km</p>
                          {d.pace > 0 && <p className="text-xs text-muted-foreground">{d.pace} min/km</p>}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="distance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#condGrad)"
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: 'hsl(var(--background))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function PracticeProgressView({ sessions, games = [], mode, conditioningSessions = [] }: PracticeProgressViewProps) {
  const totals = useMemo(() => {
    const t = { ftM: 0, ftA: 0, midM: 0, midA: 0, threeM: 0, threeA: 0 };
    sessions.forEach(s => {
      t.ftM += s.ft_made; t.ftA += s.ft_attempted;
      t.midM += s.midrange_made; t.midA += s.midrange_attempted;
      t.threeM += s.three_pt_made; t.threeA += s.three_pt_attempted;
    });
    return t;
  }, [sessions]);

  const totalShots = totals.ftA + totals.midA + totals.threeA;
  const totalMakes = totals.ftM + totals.midM + totals.threeM;

  const bestSession = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions.reduce((best, s) => {
      const att = s.ft_attempted + s.midrange_attempted + s.three_pt_attempted;
      const made = s.ft_made + s.midrange_made + s.three_pt_made;
      const bestAtt = best.ft_attempted + best.midrange_attempted + best.three_pt_attempted;
      const bestMade = best.ft_made + best.midrange_made + best.three_pt_made;
      if (att === 0) return best;
      if (bestAtt === 0) return s;
      return (made / att) > (bestMade / bestAtt) ? s : best;
    });
  }, [sessions]);

  const last5Data = useMemo(() => {
    const sorted = [...sessions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5).reverse();

    return sorted.map(s => {
      const att = s.ft_attempted + s.midrange_attempted + s.three_pt_attempted;
      const made = s.ft_made + s.midrange_made + s.three_pt_made;
      return {
        date: format(new Date(s.created_at), 'MMM d'),
        fg: pct(made, att),
        ft: pct(s.ft_made, s.ft_attempted),
        three: pct(s.three_pt_made, s.three_pt_attempted),
        shots: att,
      };
    });
  }, [sessions]);

  const gameTotals = useMemo(() => {
    if (games.length === 0) return { ftPct: 0, midPct: 0, threePct: 0 };
    const t = { ftM: 0, ftA: 0, fgM: 0, fgA: 0, threeM: 0, threeA: 0 };
    games.forEach(g => {
      t.ftM += g.ftMade; t.ftA += g.ftAttempted;
      t.fgM += g.fgMade; t.fgA += g.fgAttempted;
      t.threeM += g.threePtMade; t.threeA += g.threePtAttempted;
    });
    const midM = t.fgM - t.threeM;
    const midA = t.fgA - t.threeA;
    return {
      ftPct: pct(t.ftM, t.ftA),
      midPct: pct(midM, midA),
      threePct: pct(t.threeM, t.threeA),
    };
  }, [games]);

  const hasShootingSessions = sessions.length > 0;
  const hasConditioningSessions = conditioningSessions.length > 0;

  if (!hasShootingSessions && !hasConditioningSessions) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Target className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Log practice or conditioning sessions to see your trends</p>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'combined') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Practice vs Game Performance
          </h3>
          <p className="text-sm text-muted-foreground">See where your practice translates to games</p>
        </div>

        {hasShootingSessions && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GapCard
              label="Free Throws"
              practiceVal={pct(totals.ftM, totals.ftA)}
              gameVal={gameTotals.ftPct}
              delay={0}
            />
            <GapCard
              label="Mid Range"
              practiceVal={pct(totals.midM, totals.midA)}
              gameVal={gameTotals.midPct}
              delay={0.05}
            />
            <GapCard
              label="3-Pointers"
              practiceVal={pct(totals.threeM, totals.threeA)}
              gameVal={gameTotals.threePct}
              delay={0.1}
            />
          </div>
        )}

        {/* Insight callout */}
        {hasShootingSessions && (() => {
          const gaps = [
            { label: 'FT', diff: pct(totals.ftM, totals.ftA) - gameTotals.ftPct },
            { label: 'Mid', diff: pct(totals.midM, totals.midA) - gameTotals.midPct },
            { label: '3PT', diff: pct(totals.threeM, totals.threeA) - gameTotals.threePct },
          ].filter(g => g.diff > 0).sort((a, b) => b.diff - a.diff);

          if (gaps.length === 0) return null;
          const biggest = gaps[0];

          return (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="py-4">
                <p className="text-sm font-medium">
                  💡 Your <span className="font-bold">{biggest.label}</span> drops{' '}
                  <span className="text-red-500 font-bold">{biggest.diff}%</span> from practice to games.
                  Focus on pressure shooting drills.
                </p>
              </CardContent>
            </Card>
          );
        })()}

        {hasConditioningSessions && <ConditioningSection sessions={conditioningSessions} />}
      </div>
    );
  }

  // Practice view
  return (
    <div className="space-y-6">
      {/* Shooting stats */}
      {hasShootingSessions && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="FT %"
              value={pct(totals.ftM, totals.ftA)}
              icon={<Target className="h-4 w-4" />}
              variant="default"
              delay={0}
              subLabel={`${totals.ftM}/${totals.ftA}`}
            />
            <StatCard
              label="Mid %"
              value={pct(totals.midM, totals.midA)}
              icon={<Percent className="h-4 w-4" />}
              variant="default"
              delay={0.05}
              subLabel={`${totals.midM}/${totals.midA}`}
            />
            <StatCard
              label="3PT %"
              value={pct(totals.threeM, totals.threeA)}
              icon={<Circle className="h-4 w-4" />}
              variant="accent"
              delay={0.1}
              subLabel={`${totals.threeM}/${totals.threeA}`}
            />
            <StatCard
              label="Total"
              value={totalShots}
              suffix=""
              icon={<Flame className="h-4 w-4" />}
              variant="warning"
              delay={0.15}
              subLabel={`${pct(totalMakes, totalShots)}% overall`}
            />
          </div>

          {bestSession && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="py-3 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold">Best Session:</span>{' '}
                  {format(new Date(bestSession.created_at), 'MMM d')} —{' '}
                  {pct(
                    bestSession.ft_made + bestSession.midrange_made + bestSession.three_pt_made,
                    bestSession.ft_attempted + bestSession.midrange_attempted + bestSession.three_pt_attempted
                  )}% FG
                </div>
              </CardContent>
            </Card>
          )}

          {last5Data.length >= 2 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-base">Last 5 Sessions</h3>
                <p className="text-xs text-muted-foreground">Overall FG% trend</p>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <ChartContainer
                  config={{
                    fg: { label: 'FG%', color: 'hsl(var(--primary))' },
                  }}
                  className="h-[220px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={last5Data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="practiceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                              <p className="text-xs text-muted-foreground mb-1">{label}</p>
                              <p className="font-bold">{d.fg}% FG</p>
                              <p className="text-xs text-muted-foreground">{d.shots} shots</p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="fg"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#practiceGrad)"
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: 'hsl(var(--background))' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Conditioning section */}
      {hasConditioningSessions && <ConditioningSection sessions={conditioningSessions} />}
    </div>
  );
}