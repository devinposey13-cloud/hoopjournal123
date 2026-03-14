import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Trophy, Video, Star, TrendingUp, ChevronRight, Trash2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { GameStats, VideoClip } from '@/types/basketball';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface RecentActivityProps {
  games: GameStats[];
  clips?: VideoClip[];
  onViewGame?: (gameId: string) => void;
  onViewAllGames?: () => void;
  onDeleteGame?: (gameId: string) => void;
}

interface ActivityItem {
  id: string;
  type: 'game' | 'clip' | 'milestone';
  title: string;
  subtitle: string;
  date: Date;
  icon: React.ElementType;
  accent?: boolean;
  onClick?: () => void;
}

export function RecentActivity({ games, clips = [], onViewGame, onViewAllGames, onDeleteGame }: RecentActivityProps) {
  const isMobile = useIsMobile();
  // Build activity feed from games
  const activities: ActivityItem[] = games.slice(0, 5).map(game => ({
    id: game.id,
    type: 'game' as const,
    title: `${game.isWin ? 'W' : 'L'} vs ${game.opponent}`,
    subtitle: `${game.points} PTS · ${game.rebounds} REB · ${game.assists} AST`,
    date: new Date(game.date),
    icon: game.isWin ? Trophy : TrendingUp,
    accent: game.isWin,
    onClick: () => onViewGame?.(game.id),
  }));

  // Add clips to feed
  clips.slice(0, 3).forEach(clip => {
    activities.push({
      id: clip.id,
      type: 'clip',
      title: clip.title,
      subtitle: clip.description || 'Highlight clip',
      date: new Date(clip.date),
      icon: Video,
    });
  });

  // Sort by date, newest first
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity yet</p>
        <p className="text-xs mt-1">Log your first game to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Recent Activity</h3>
        {onViewAllGames && games.length > 3 && (
          <button 
            onClick={onViewAllGames}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {activities.slice(0, 5).map((activity) => {
          const Icon = activity.icon;
          const timeAgo = formatDistanceToNow(activity.date, { addSuffix: true });
          
          return (
            <div
              key={activity.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg group",
                "bg-card/50 border border-border/50",
                "hover:bg-card/80 transition-colors",
                activity.onClick && "cursor-pointer"
              )}
              onClick={activity.onClick}
              role={activity.onClick ? "button" : undefined}
              tabIndex={activity.onClick ? 0 : undefined}
            >
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                activity.accent ? "bg-green-500/10" : "bg-muted/50"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  activity.accent ? "text-green-500" : "text-muted-foreground"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  {timeAgo}
                </span>
                {activity.type === 'game' && onDeleteGame && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGame(activity.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
