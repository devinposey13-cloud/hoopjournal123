import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { PlayerCard } from '@/components/dashboard/PlayerCard';
import { DashboardQuickStats } from '@/components/dashboard/DashboardQuickStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { GuestAccountGate } from '@/components/GuestAccountGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard, ClipboardPlus, TrendingUp, MessageCircle, MoreHorizontal, Plus, LogIn, Shield, FileText, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameStats, PlayerProfile, SeasonStats } from '@/types/basketball';

// ─── Sample Data ────────────────────────────────────────────────────

const SAMPLE_PROFILE: PlayerProfile = {
  name: 'Demo Player',
  team: 'Demo High School',
  position: 'Guard',
  number: 23,
  height: "6'1\"",
  grade: '10th Grade',
  classYear: 2028,
  isProfilePublic: false,
  coachPersona: null,
  coachVoiceGender: 'male',
  courtRole: 'scorer',
  playingLevel: 'high_school',
  seasonGoals: ['Improve 3PT%', 'Lead team in assists'],
  onboardingCompletedAt: new Date().toISOString(),
  username: 'demoplayer',
  displayName: 'Demo Player',
  ringOfHonorOptIn: false,
  receiveGameSummaries: false,
};

const SAMPLE_GAMES: GameStats[] = [
  {
    id: 'demo-1',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    opponent: 'Westside Warriors',
    points: 22,
    rebounds: 7,
    assists: 5,
    steals: 3,
    blocks: 1,
    turnovers: 2,
    fouls: 2,
    minutesPlayed: 32,
    fgMade: 8,
    fgAttempted: 15,
    threePtMade: 3,
    threePtAttempted: 7,
    ftMade: 3,
    ftAttempted: 4,
    isWin: true,
  },
  {
    id: 'demo-2',
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    opponent: 'Eastside Eagles',
    points: 18,
    rebounds: 5,
    assists: 8,
    steals: 2,
    blocks: 0,
    turnovers: 3,
    fouls: 3,
    minutesPlayed: 28,
    fgMade: 7,
    fgAttempted: 14,
    threePtMade: 2,
    threePtAttempted: 5,
    ftMade: 2,
    ftAttempted: 2,
    isWin: true,
  },
  {
    id: 'demo-3',
    date: new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0],
    opponent: 'North Stars',
    points: 14,
    rebounds: 4,
    assists: 6,
    steals: 1,
    blocks: 2,
    turnovers: 4,
    fouls: 1,
    minutesPlayed: 30,
    fgMade: 5,
    fgAttempted: 13,
    threePtMade: 1,
    threePtAttempted: 4,
    ftMade: 3,
    ftAttempted: 5,
    isWin: false,
  },
];

const SAMPLE_STATS: SeasonStats = {
  gamesPlayed: 3,
  wins: 2,
  losses: 1,
  avgPoints: 18,
  avgRebounds: 5.3,
  avgAssists: 6.3,
  avgSteals: 2,
  avgBlocks: 1,
  fgPercentage: 47.6,
  threePtPercentage: 37.5,
  ftPercentage: 72.7,
};

// ─── Component ──────────────────────────────────────────────────────

type GuestTab = 'dashboard' | 'log' | 'progress' | 'coach' | 'more';

export function GuestDashboard() {
  const [activeTab, setActiveTab] = useState<GuestTab>('dashboard');
  const [gateOpen, setGateOpen] = useState(false);
  const { exitGuestMode } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const guard = () => setGateOpen(true);

  const tabs = [
    { id: 'dashboard' as GuestTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'log' as GuestTab, label: 'Log', icon: ClipboardPlus },
    { id: 'progress' as GuestTab, label: 'Progress', icon: TrendingUp },
    { id: 'coach' as GuestTab, label: 'Coach', icon: MessageCircle },
    { id: 'more' as GuestTab, label: 'More', icon: MoreHorizontal },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Guest banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-primary font-medium">
          👋 Guest Mode — your data is stored locally only
        </p>
        <Button size="sm" variant="ghost" className="text-xs text-primary h-7" onClick={exitGuestMode}>
          <LogIn className="w-3 h-3 mr-1" /> Sign Up
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            <PlayerCard
              profile={SAMPLE_PROFILE}
              games={SAMPLE_GAMES}
              seasonStats={SAMPLE_STATS}
              xpProgress={{ current_level: 5, current_xp: 420 }}
              seasonRecord={{ wins: 2, losses: 1 }}
            />

            <DashboardQuickStats
              games={SAMPLE_GAMES}
              seasonStats={SAMPLE_STATS}
              xpProgress={{ current_level: 5, current_xp: 420 }}
            />

            <div className="flex gap-3">
              <Button className="flex-1 gradient-primary font-semibold" onClick={guard}>
                <Plus className="w-4 h-4 mr-2" /> Log Game
              </Button>
            </div>

            <RecentActivity
              games={SAMPLE_GAMES}
              onViewGame={() => guard()}
            />
          </>
        )}

        {activeTab === 'log' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Game Log</h2>
            <p className="text-sm text-muted-foreground">Sample games shown below. Sign up to log your own games.</p>
            {SAMPLE_GAMES.map((game) => (
              <Card key={game.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground">{game.isWin ? 'W' : 'L'} vs {game.opponent}</p>
                      <p className="text-xs text-muted-foreground">{game.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{game.points} PTS</p>
                      <p className="text-xs text-muted-foreground">{game.rebounds} REB · {game.assists} AST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button className="w-full" variant="outline" onClick={guard}>
              <Plus className="w-4 h-4 mr-2" /> Log Your First Game
            </Button>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Progress</h2>
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Season Averages (Sample)</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'PPG', value: SAMPLE_STATS.avgPoints },
                    { label: 'RPG', value: SAMPLE_STATS.avgRebounds },
                    { label: 'APG', value: SAMPLE_STATS.avgAssists },
                    { label: 'FG%', value: `${SAMPLE_STATS.fgPercentage}%` },
                    { label: '3PT%', value: `${SAMPLE_STATS.threePtPercentage}%` },
                    { label: 'FT%', value: `${SAMPLE_STATS.ftPercentage}%` },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-lg font-bold text-primary">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Button className="w-full" variant="outline" onClick={guard}>
              Sign Up to Track Your Progress
            </Button>
          </div>
        )}

        {activeTab === 'coach' && (
          <div className="space-y-4 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">AI Coach</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Get personalized coaching tips, pregame talks, and post-game analysis powered by AI.
            </p>
            <Button className="gradient-primary font-semibold" onClick={guard}>
              <LogIn className="w-4 h-4 mr-2" /> Sign Up to Chat with Coach
            </Button>
          </div>
        )}

        {activeTab === 'more' && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">More</h2>
            <Button variant="outline" className="w-full justify-start" onClick={exitGuestMode}>
              <LogIn className="w-4 h-4 mr-3" /> Sign Up / Log In
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/privacy')}>
              <Shield className="w-4 h-4 mr-3" /> Privacy Policy
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/terms')}>
              <FileText className="w-4 h-4 mr-3" /> Terms of Service
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/eula')}>
              <ScrollText className="w-4 h-4 mr-3" /> EULA
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className={cn('w-5 h-5', activeTab === tab.id && 'stroke-[2.5px]')} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <GuestAccountGate open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
}
