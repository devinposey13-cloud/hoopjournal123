import { cn } from '@/lib/utils';
import { CalendarDays, Video, Trophy, Gamepad2, Settings, Shield } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SeasonSelector } from './SeasonSelector';
import { Season } from '@/types/basketball';

export type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 'schedule' | 'minigames' | 'coach' | 'settings' | 'admin';

interface MoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tab: Tab) => void;
  activeTab: Tab;
  isAdmin?: boolean;
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
  onDeleteSeason?: (seasonId: string) => Promise<boolean>;
}

// Clips and Milestones moved to Progress hub
const menuItems = [
  { id: 'minigames' as Tab, label: 'Play', icon: Gamepad2 },
  { id: 'settings' as Tab, label: 'Settings', icon: Settings },
];

export function MoreMenu({
  open,
  onOpenChange,
  onSelect,
  activeTab,
  isAdmin = false,
  seasons,
  activeSeason,
  onSeasonChange,
  onCreateSeason,
  onDeleteSeason,
}: MoreMenuProps) {
  const allItems = isAdmin
    ? [...menuItems, { id: 'admin' as Tab, label: 'Admin', icon: Shield }]
    : menuItems;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">More</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3 pb-6">
          {allItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary/50 text-foreground hover:bg-secondary'
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Season Selector */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Season</span>
            <SeasonSelector
              seasons={seasons}
              activeSeason={activeSeason}
              onSeasonChange={onSeasonChange}
              onCreateSeason={onCreateSeason}
              onDeleteSeason={onDeleteSeason}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
