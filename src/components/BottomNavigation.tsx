import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ClipboardPlus, MessageCircle, MoreHorizontal, TrendingUp } from 'lucide-react';
import { MoreMenu } from './MoreMenu';
import { Season } from '@/types/basketball';


export type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 'schedule' | 'minigames' | 'coach' | 'settings' | 'admin' | 'profile';

interface BottomNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
  onDeleteSeason?: (seasonId: string) => Promise<boolean>;
  isAdmin?: boolean;
  adminNotificationCount?: number;
}

const primaryTabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard, route: '/' },
  { id: 'log' as Tab, label: 'Log', icon: ClipboardPlus, route: '/log/history' },
  { id: 'progress' as Tab, label: 'Progress', icon: TrendingUp, route: '/progress/overview' },
  { id: 'coach' as Tab, label: 'Coach', icon: MessageCircle },
];

// Helper to check if a tab is in the "More" menu (Clips/Milestones moved to Progress hub)
const isMoreTab = (tab: Tab): boolean => {
  return ['minigames', 'settings', 'admin'].includes(tab);
};

export function BottomNavigation({
  activeTab,
  onTabChange,
  seasons,
  activeSeason,
  onSeasonChange,
  onCreateSeason,
  onDeleteSeason,
  isAdmin = false,
  adminNotificationCount = 0,
}: BottomNavigationProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on a /log or /progress route
  const isLogRoute = location.pathname.startsWith('/log');
  const isProgressRoute = location.pathname.startsWith('/progress');

  // Map 'log' -> 'games' and 'progress' -> 'stats' for display purposes
  const getDisplayActiveTab = (tab: Tab): Tab => {
    if (tab === 'games') return 'log';
    if (tab === 'stats') return 'progress';
    return tab;
  };

  const displayActiveTab = isLogRoute ? 'log' : isProgressRoute ? 'progress' : getDisplayActiveTab(activeTab);

  const handleTabClick = (tab: typeof primaryTabs[0]) => {
    // Always update the active tab state first
    onTabChange(tab.id);
    // Then navigate if there's a route
    if (tab.route) {
      navigate(tab.route);
    }
  };

  const handleMoreMenuSelect = (tab: Tab) => {
    onTabChange(tab);
    setMoreMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {primaryTabs.map((tab) => {
            const isActive = displayActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative',
              isMoreTab(activeTab)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <MoreHorizontal className={cn('w-5 h-5', isMoreTab(activeTab) && 'stroke-[2.5px]')} />
              {isAdmin && adminNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </div>
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      <MoreMenu
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        onSelect={handleMoreMenuSelect}
        activeTab={activeTab}
        isAdmin={isAdmin}
        adminNotificationCount={adminNotificationCount}
        seasons={seasons}
        activeSeason={activeSeason}
        onSeasonChange={onSeasonChange}
        onCreateSeason={onCreateSeason}
        onDeleteSeason={onDeleteSeason}
      />
    </>
  );
}
