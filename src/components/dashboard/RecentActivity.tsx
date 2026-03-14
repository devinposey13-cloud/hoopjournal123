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
      
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity, index) => (
          <div key={activity.id}>
            <ActivityItemRow
              activity={activity}
              isMobile={isMobile}
              onDeleteGame={activity.type === 'game' ? onDeleteGame : undefined}
            />
            {index < Math.min(activities.length, 5) - 1 && (
              <div className="border-b border-border/30 mt-3 mx-3" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const SWIPE_THRESHOLD = 70;
const DELETE_WIDTH = 72;

function ActivityItemRow({ activity, isMobile, onDeleteGame }: { 
  activity: ActivityItem; 
  isMobile: boolean;
  onDeleteGame?: (id: string) => void;
}) {
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-DELETE_WIDTH, -20, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-DELETE_WIDTH, -20, 0], [1, 0.8, 0.6]);

  const Icon = activity.icon;
  const timeAgo = formatDistanceToNow(activity.date, { addSuffix: true });

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setIsSwipeOpen(true);
    } else {
      setIsSwipeOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteGame?.(activity.id);
    setIsSwipeOpen(false);
  };

  // Determine result indicator color
  const isWin = activity.type === 'game' && activity.accent;
  const isLoss = activity.type === 'game' && !activity.accent;

  const itemContent = (
    <div
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
      {/* Result indicator dot + icon */}
      <div className="relative flex-shrink-0">
        {activity.type === 'game' && (
          <div className={cn(
            "absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full border-2 border-card z-10",
            isWin ? "bg-green-500" : "bg-red-500"
          )} />
        )}
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center",
          isWin ? "bg-green-500/10" : isLoss ? "bg-red-500/10" : "bg-muted/50"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            isWin ? "text-green-500" : isLoss ? "text-red-500" : "text-muted-foreground"
          )} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.title}</p>
        <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {timeAgo}
        </span>
        {!isMobile && onDeleteGame && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile && onDeleteGame) {
    return (
      <div className="relative overflow-hidden rounded-lg">
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive rounded-r-lg"
          style={{ width: DELETE_WIDTH, opacity: deleteOpacity }}
        >
          <motion.button
            onClick={handleDelete}
            className="flex flex-col items-center gap-1 text-destructive-foreground p-3"
            style={{ scale: deleteScale }}
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-xs font-medium">Delete</span>
          </motion.button>
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          animate={{ x: isSwipeOpen ? -DELETE_WIDTH : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ x }}
          className="relative z-10"
        >
          {itemContent}
        </motion.div>
      </div>
    );
  }

  return itemContent;
}
