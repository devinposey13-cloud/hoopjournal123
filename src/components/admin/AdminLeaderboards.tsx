import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Download, Trophy, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { planCatalog, type PlanId } from '@/lib/plans';

interface LeaderboardEntry {
  user_id: string;
  profile_name: string;
  display_name: string | null;
  team: string;
  position: string;
  email: string | null;
  effective_plan: string;
  metric_value: number;
  games_logged: number;
  last_active: string | null;
  avatar_url: string | null;
}

const METRIC_OPTIONS = [
  { value: 'xp_total', label: 'XP Total' },
  { value: 'current_level', label: 'Current Level' },
  { value: 'games_all', label: 'Games Logged (All Time)' },
  { value: 'games_30d', label: 'Games Logged (Last 30 Days)' },
  { value: 'avg_points_10', label: 'Avg Points (Last 10 Games)' },
  { value: 'avg_assists_10', label: 'Avg Assists (Last 10 Games)' },
  { value: 'avg_rebounds_10', label: 'Avg Rebounds (Last 10 Games)' },
  { value: 'win_pct_10', label: 'Win % (Last 10 Games)' },
];

const PLAN_OPTIONS = [
  { value: 'all', label: 'All Plans' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'elite', label: 'Elite' },
];

const PAGE_SIZE = 25;

export function AdminLeaderboards() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState('xp_total');
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [minGames, setMinGames] = useState('0');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<'metric_value' | 'games_logged' | 'last_active'>('metric_value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchLeaderboard = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        min_games: minGames || '0',
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (planFilter !== 'all') params.set('plan', planFilter);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-leaderboards?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch leaderboard');

      setEntries(data.leaderboard || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Leaderboard error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, metric, page, searchQuery, planFilter, minGames]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [metric, searchQuery, planFilter, minGames]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    let valA: number | string, valB: number | string;
    switch (sortField) {
      case 'metric_value':
        valA = a.metric_value;
        valB = b.metric_value;
        break;
      case 'games_logged':
        valA = a.games_logged;
        valB = b.games_logged;
        break;
      case 'last_active':
        valA = a.last_active || '';
        valB = b.last_active || '';
        break;
      default:
        return 0;
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const exportCSV = () => {
    const metricLabel = METRIC_OPTIONS.find((m) => m.value === metric)?.label || metric;
    const headers = ['Rank', 'Player Name', 'Team', 'Position', 'Email', 'Plan', metricLabel, 'Games Logged', 'Last Active'];
    const rows = sortedEntries.map((e, i) => [
      page * PAGE_SIZE + i + 1,
      e.display_name || e.profile_name,
      e.team,
      e.position,
      e.email || '',
      e.effective_plan,
      e.metric_value,
      e.games_logged,
      e.last_active ? new Date(e.last_active).toLocaleDateString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard-${metric}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  const metricLabel = METRIC_OPTIONS.find((m) => m.value === metric)?.label || metric;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getPlanBadgeVariant = (plan: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (plan) {
      case 'elite': return 'default';
      case 'pro': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Leaderboards
              </CardTitle>
              <CardDescription>All-user rankings by performance metric</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={entries.length === 0}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Plan filter" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Input
              type="number"
              placeholder="Min games"
              value={minGames}
              onChange={(e) => setMinGames(e.target.value)}
              min={0}
              className="w-full"
            />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} player{total !== 1 ? 's' : ''} found</span>
            {totalPages > 1 && (
              <span>Page {page + 1} of {totalPages}</span>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No players match these filters</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="hidden md:table-cell">Team</TableHead>
                    <TableHead className="hidden lg:table-cell">Plan</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('metric_value')}>
                      <span className="flex items-center gap-1">
                        {metricLabel}
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="cursor-pointer hidden sm:table-cell" onClick={() => handleSort('games_logged')}>
                      <span className="flex items-center gap-1">
                        Games
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="cursor-pointer hidden md:table-cell" onClick={() => handleSort('last_active')}>
                      <span className="flex items-center gap-1">
                        Last Active
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry, i) => {
                    const rank = page * PAGE_SIZE + i + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <TableRow key={entry.user_id} className={isTop3 ? 'bg-primary/5' : ''}>
                        <TableCell className="text-center font-bold">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{entry.display_name || entry.profile_name}</div>
                            {entry.email && (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">{entry.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{entry.team}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={getPlanBadgeVariant(entry.effective_plan)} className="text-[10px]">
                            {planCatalog[entry.effective_plan as PlanId]?.name || entry.effective_plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">{entry.metric_value}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground tabular-nums">{entry.games_logged}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {entry.last_active ? new Date(entry.last_active).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
