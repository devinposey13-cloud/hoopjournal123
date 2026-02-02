import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ClipboardPlus, TrendingUp, MessageCircle, MoreHorizontal } from 'lucide-react';
import { MoreMenu } from './MoreMenu';
import { Season } from '@/types/basketball';

export type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 'schedule' | 'clips' | 'milestones' | 'minigames' | 'coach' | 'settings' | 'admin';

interface BottomNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
  onDeleteSeason?: (seasonId: string) => Promise<boolean>;
  isAdmin?: boolean;
}

const primaryTabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'log' as Tab, label: 'Log', icon: ClipboardPlus },
  { id: 'progress' as Tab, label: 'Progress', icon: TrendingUp },
  { id: 'coach' as Tab, label: 'Coach', icon: MessageCircle },
];

// Helper to check if a tab is in the "More" menu
const isMoreTab = (tab: Tab): boolean => {
  return ['schedule', 'clips', 'milestones', 'minigames', 'settings', 'admin'].includes(tab);
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
}: BottomNavigationProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Map 'log' -> 'games' and 'progress' -> 'stats' for display purposes
  const getDisplayActiveTab = (tab: Tab): Tab => {
    if (tab === 'games') return 'log';
    if (tab === 'stats') return 'progress';
    return tab;
  };

  const displayActiveTab = getDisplayActiveTab(activeTab);

  const handleTabClick = (tabId: Tab) => {
    if (tabId === 'log') {
      onTabChange('games');
    } else if (tabId === 'progress') {
      onTabChange('stats');
    } else {
      onTabChange(tabId);
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
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
              isMoreTab(activeTab)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className={cn('w-5 h-5', isMoreTab(activeTab) && 'stroke-[2.5px]')} />
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
        seasons={seasons}
        activeSeason={activeSeason}
        onSeasonChange={onSeasonChange}
        onCreateSeason={onCreateSeason}
        onDeleteSeason={onDeleteSeason}
      />
    </>
  );
}
