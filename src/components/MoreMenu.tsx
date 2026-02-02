import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Gamepad2, LogOut, Settings, Shield, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SeasonSelector } from './SeasonSelector';
import { Season } from '@/types/basketball';

export type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 'schedule' | 'minigames' | 'coach' | 'settings' | 'admin' | 'profile';

interface MoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tab: Tab) => void;
  activeTab: Tab;
  isAdmin?: boolean;
  adminNotificationCount?: number;
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
  onDeleteSeason?: (seasonId: string) => Promise<boolean>;
}

// Menu items - Profile added
const menuItems = [
  { id: 'profile' as Tab, label: 'Profile', icon: UserCircle, route: '/profile' },
  { id: 'minigames' as Tab, label: 'Play', icon: Gamepad2 },
  { id: 'settings' as Tab, label: 'Settings', icon: Settings },
];

export function MoreMenu({
  open,
  onOpenChange,
  onSelect,
  activeTab,
  isAdmin = false,
  adminNotificationCount = 0,
  seasons,
  activeSeason,
  onSeasonChange,
  onCreateSeason,
  onDeleteSeason,
}: MoreMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const allItems = isAdmin
    ? [...menuItems, { id: 'admin' as Tab, label: 'Admin', icon: Shield }]
    : menuItems;

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  const handleItemClick = (item: typeof menuItems[0]) => {
    if ('route' in item && item.route) {
      navigate(item.route);
      onOpenChange(false);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">More</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3 pb-6">
          {allItems.map((item) => {
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'admin' && adminNotificationCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors relative',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary/50 text-foreground hover:bg-secondary'
                )}
              >
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {showBadge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-3 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                    >
                      {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                    </Badge>
                  )}
                </div>
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
        {/* Sign Out Button */}
        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
