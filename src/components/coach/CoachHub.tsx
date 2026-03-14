import React, { useState, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCoachAvatarUrl } from '@/utils/coachAvatar';
import { 
  Bot, 
  MessageCircle, 
  Mic, 
  FileText, 
  Sparkles, 
  Target,
  Brain,
  Lightbulb,
  BookOpen,
  Users,
  Dumbbell,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { GameStats, SeasonStats, PlayerProfile } from '@/types/basketball';

// Lazy load components
const CoachChat = lazy(() => import('@/components/CoachChat').then(m => ({ default: m.CoachChat })));
const BasketballKnowledge = lazy(() => import('@/components/BasketballKnowledge').then(m => ({ default: m.BasketballKnowledge })));
const PlayerComparison = lazy(() => import('@/components/PlayerComparison').then(m => ({ default: m.PlayerComparison })));

interface CoachHubProps {
  games: GameStats[];
  seasonStats: SeasonStats;
  profile: PlayerProfile;
  prefillPrompt?: string;
  onPrefillConsumed?: () => void;
}

type CoachSection = 'chat' | 'knowledge' | 'compare';

function ChatSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

// Generate dynamic focus insight based on recent performance
function generateTodaysFocus(games: GameStats[], seasonStats: SeasonStats): { message: string; icon: React.ElementType } {
  if (games.length === 0) {
    return {
      message: "Welcome! Log your first game and I'll provide personalized insights.",
      icon: Sparkles,
    };
  }

  const recentGames = games.slice(0, 5);
  
  // Calculate recent trends
  const recentAvgTurnovers = recentGames.reduce((sum, g) => sum + g.turnovers, 0) / recentGames.length;
  const recentAvgAssists = recentGames.reduce((sum, g) => sum + g.assists, 0) / recentGames.length;
  const recentFgPct = recentGames.reduce((sum, g) => sum + (g.fgAttempted > 0 ? g.fgMade / g.fgAttempted : 0), 0) / recentGames.length;
  const recentWins = recentGames.filter(g => g.isWin).length;
  
  // Priority-based focus suggestions
  if (recentAvgTurnovers > 3) {
    return {
      message: `Focus on ball security today. Your turnovers average ${recentAvgTurnovers.toFixed(1)} over your last ${recentGames.length} games.`,
      icon: Target,
    };
  }
  
  if (recentFgPct < 0.35) {
    return {
      message: `Shot selection is key. Take quality shots and trust your form.`,
      icon: Target,
    };
  }
  
  if (recentWins >= 4) {
    return {
      message: `You're on fire with ${recentWins} wins in your last ${recentGames.length}! Keep the momentum going.`,
      icon: Sparkles,
    };
  }
  
  if (recentAvgAssists >= 4) {
    return {
      message: `Great playmaking with ${recentAvgAssists.toFixed(1)} assists per game. Keep finding teammates!`,
      icon: Lightbulb,
    };
  }
  
  return {
    message: "Stay focused on what you can control: effort, attitude, and communication.",
    icon: Brain,
  };
}

// Generate coach notes/insights from recent games
function generateRecentInsights(games: GameStats[]): Array<{ id: string; text: string; date: string; type: 'positive' | 'neutral' | 'improvement' }> {
  const insights: Array<{ id: string; text: string; date: string; type: 'positive' | 'neutral' | 'improvement' }> = [];
  
  if (games.length === 0) return insights;
  
  const lastGame = games[0];
  const lastGameDate = new Date(lastGame.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  // Last game insights
  if (lastGame.isWin) {
    insights.push({
      id: '1',
      text: `Strong win against ${lastGame.opponent} with ${lastGame.points} points.`,
      date: lastGameDate,
      type: 'positive',
    });
  }
  
  if (lastGame.assists >= 5) {
    insights.push({
      id: '2',
      text: `Excellent playmaking: ${lastGame.assists} assists in your last game.`,
      date: lastGameDate,
      type: 'positive',
    });
  }
  
  if (lastGame.turnovers >= 4) {
    insights.push({
      id: '3',
      text: `Ball security needs attention: ${lastGame.turnovers} turnovers last game.`,
      date: lastGameDate,
      type: 'improvement',
    });
  }
  
  // Trend insights
  if (games.length >= 3) {
    const last3 = games.slice(0, 3);
    const avgPts = last3.reduce((sum, g) => sum + g.points, 0) / 3;
    
    if (avgPts >= 15) {
      insights.push({
        id: '4',
        text: `Scoring is hot: averaging ${avgPts.toFixed(1)} PPG over last 3 games.`,
        date: 'Trend',
        type: 'positive',
      });
    }
  }
  
  // Add a default insight if none generated
  if (insights.length === 0) {
    insights.push({
      id: '5',
      text: 'Keep logging games to unlock personalized insights and patterns.',
      date: 'Tip',
      type: 'neutral',
    });
  }
  
  return insights.slice(0, 4);
}

export function CoachHub({ games, seasonStats, profile, prefillPrompt, onPrefillConsumed }: CoachHubProps) {
  const [activeSection, setActiveSection] = useState<CoachSection>('chat');
  
  const todaysFocus = useMemo(() => generateTodaysFocus(games, seasonStats), [games, seasonStats]);
  const recentInsights = useMemo(() => generateRecentInsights(games), [games]);
  const FocusIcon = todaysFocus.icon;

  const actionCards = [
    { id: 'chat', label: 'Coach Chat', icon: MessageCircle, description: 'Ask for personalized feedback on your game.' },
    { id: 'knowledge', label: 'BB Knowledge', icon: BookOpen, description: 'Learn basketball strategy and concepts.' },
    { id: 'compare', label: 'Player Compare', icon: Users, description: 'Compare your stats with top players.' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Coach AI</h1>
        <p className="text-sm text-muted-foreground">Personalized feedback based on your stats and recent games.</p>
      </div>

      {/* Avatar */}
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-2">
          <div className="absolute inset-0 rounded-full animate-[pulse_2.5s_ease-in-out_infinite] bg-primary/20 scale-125" />
          <div className="absolute inset-0 rounded-full animate-[pulse_3s_ease-in-out_infinite] bg-primary/10 scale-150" />
          <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/30">
            <img src={getCoachAvatarUrl(profile.coachVoiceGender)} alt="Coach AI" className="w-full h-full object-cover" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Your personal performance coach
        </p>
      </div>

      {/* Today's Focus Card - Hero placement */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <FocusIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                  Today's Focus
                </p>
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  {todaysFocus.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Primary Actions Row - Quick Access Cards */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Quick Actions
        </p>
        <div className="flex justify-center">
        <ScrollArea className="w-auto">
          <div className="flex gap-3 pb-2 justify-center">
            {actionCards.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => setActiveSection(action.id as CoachSection)}
                className={cn(
                  "flex-shrink-0 w-28 sm:w-32 p-4 rounded-xl border transition-all text-left",
                  "hover:border-primary/50 hover:bg-primary/5",
                  activeSection === action.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card"
                )}
              >
                <action.icon className={cn(
                  "w-6 h-6 mb-2",
                  activeSection === action.id ? "text-primary" : "text-muted-foreground"
                )} />
                <p className={cn(
                  "text-sm font-medium truncate",
                  activeSection === action.id ? "text-primary" : "text-foreground"
                )}>
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {action.description}
                </p>
              </motion.button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        </div>
      </div>

      {/* Main Content Area - reduced top spacing */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="-mt-2 mb-4"
        >
          <Suspense fallback={<ChatSkeleton />}>
            {activeSection === 'chat' && (
              <div className="max-w-2xl mx-auto">
                <CoachChat 
                  games={games} 
                  seasonStats={seasonStats} 
                  profile={profile}
                  prefillPrompt={prefillPrompt}
                  onPrefillConsumed={onPrefillConsumed}
                />
              </div>
            )}
            {activeSection === 'knowledge' && (
              <div className="max-w-3xl">
                <BasketballKnowledge />
              </div>
            )}
            {activeSection === 'compare' && (
              <div className="max-w-3xl">
                <PlayerComparison seasonStats={seasonStats} profile={profile} />
              </div>
            )}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Insights & History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Coach Notes</h3>
          </div>
        </div>
        
        <div className="grid gap-3">
          {recentInsights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className={cn(
                "border-l-4 transition-colors",
                insight.type === 'positive' && "border-l-green-500/70 bg-green-500/5",
                insight.type === 'improvement' && "border-l-amber-500/70 bg-amber-500/5",
                insight.type === 'neutral' && "border-l-muted-foreground/30"
              )}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground flex-1">
                      {insight.text}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {insight.date}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Training Tools Placeholder */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Training Tools</h3>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            Coming Soon
          </span>
        </div>
        
        <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
          <CardContent className="p-6 text-center">
            <Dumbbell className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Drills, focus exercises, and mental training coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
