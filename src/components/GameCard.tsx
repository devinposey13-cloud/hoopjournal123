import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { GameStats, PlayerProfile, PlayerTeam } from '@/types/basketball';
import { cn } from '@/lib/utils';
import { Trash2, FileDown, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { exportGameBoxScorePdf } from '@/utils/exportPdf';
import { toast } from 'sonner';
import { usePlan } from '@/hooks/usePlanState';
import { track } from '@/lib/plans';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface GameCardProps {
  game: GameStats;
  profile?: PlayerProfile;
  onDelete?: (id: string) => void;
  teams?: PlayerTeam[];
  onTeamChange?: (gameId: string, teamId: string | null) => void;
}

const SWIPE_THRESHOLD = 80;
const DELETE_WIDTH = 80;

export function GameCard({ game, profile, onDelete, teams, onTeamChange }: GameCardProps) {
  const { currentPlan } = usePlan();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-DELETE_WIDTH, -20, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-DELETE_WIDTH, -20, 0], [1, 0.8, 0.6]);

  const handleTeamChange = (teamId: string | null, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTeamChange) {
      onTeamChange(game.id, teamId);
    }
  };

  const handleExportPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canUseFeature(currentPlan, 'exportPdf')) {
      navigate('/upgrade?reason=export_pdf');
      return;
    }
    
    if (!profile) {
      toast.error('Profile not available for export');
      return;
    }
    
    toast.info('Generating PDF...');
    await exportGameBoxScorePdf(profile, { game });
    toast.success('Box score PDF exported!');
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setIsSwipeOpen(true);
    } else {
      setIsSwipeOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(game.id);
      setIsSwipeOpen(false);
    }
  };

  const cardContent = (
    <div className={cn(
      'stat-card group cursor-pointer',
      'transition-all duration-300 ease-out',
      'hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5',
      'hover:border-primary/30 hover:-translate-y-0.5'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'px-2 py-1 rounded text-xs font-bold uppercase transition-all duration-300',
              game.isWin
                ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)] group-hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                : 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] group-hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]'
            )}
          >
            {game.isWin ? 'Win' : 'Loss'}
          </div>
          <span className="text-sm text-muted-foreground">
            {format(new Date(game.date), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {teams && teams.length > 0 && onTeamChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  title="Assign Team"
                >
                  <Users className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-popover border-border z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={(e) => handleTeamChange(null, e as unknown as React.MouseEvent)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="text-muted-foreground">Unassigned</span>
                  {!game.teamId && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={(e) => handleTeamChange(team.id, e as unknown as React.MouseEvent)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span>{team.name}</span>
                    {game.teamId === team.id && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {profile && (
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={handleExportPdf}
              title="Export PDF"
            >
              <FileDown className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="md:opacity-0 md:group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(game.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold text-lg">vs {game.opponent}</h3>
        {game.teamName ? (
          <p className="text-xs text-muted-foreground">Playing for {game.teamName}</p>
        ) : (
          <p className="text-xs text-amber-500/80 flex items-center gap-1">
            <Users className="w-3 h-3" />
            No team assigned
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <StatItem label="PTS" value={game.points} highlight />
        <StatItem label="REB" value={game.rebounds} />
        <StatItem label="AST" value={game.assists} />
        <StatItem label="STL" value={game.steals} />
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-4">
        <StatItem
          label="FG"
          value={`${game.fgMade}/${game.fgAttempted}`}
          subValue={
            game.fgAttempted > 0
              ? `${Math.round((game.fgMade / game.fgAttempted) * 100)}%`
              : '0%'
          }
        />
        <StatItem
          label="3PT"
          value={`${game.threePtMade}/${game.threePtAttempted}`}
          subValue={
            game.threePtAttempted > 0
              ? `${Math.round((game.threePtMade / game.threePtAttempted) * 100)}%`
              : '0%'
          }
        />
        <StatItem
          label="FT"
          value={`${game.ftMade}/${game.ftAttempted}`}
          subValue={
            game.ftAttempted > 0
              ? `${Math.round((game.ftMade / game.ftAttempted) * 100)}%`
              : '0%'
          }
        />
      </div>
    </div>
  );

  // Mobile: wrap with swipe-to-delete
  if (isMobile && onDelete) {
    return (
      <div className="relative overflow-hidden rounded-lg">
        {/* Delete action behind the card */}
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive rounded-r-lg"
          style={{
            width: DELETE_WIDTH,
            opacity: deleteOpacity,
          }}
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

        {/* Swipeable card */}
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
          <Link to={`/game/${game.id}`} className="block">
            {cardContent}
          </Link>
        </motion.div>
      </div>
    );
  }

  // Desktop: normal link
  return (
    <Link to={`/game/${game.id}`} className="block">
      {cardContent}
    </Link>
  );
}

function StatItem({
  label,
  value,
  subValue,
  highlight,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          'font-bold',
          highlight ? 'text-xl text-primary' : 'text-base text-foreground'
        )}
      >
        {value}
      </p>
      {subValue && (
        <p className="text-[10px] text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}
