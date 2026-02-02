import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ClipboardPlus, TrendingUp, MessageCircle, MoreHorizontal, CalendarDays, Video, Trophy, Gamepad2, Settings, Shield } from 'lucide-react';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';
import { SeasonSelector } from './SeasonSelector';
import { Season } from '@/types/basketball';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 'schedule' | 'clips' | 'milestones' | 'minigames' | 'coach' | 'settings' | 'admin';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
  onDeleteSeason?: (seasonId: string) => Promise<boolean>;
  isAdmin?: boolean;
}

// Primary tabs shown in the main nav bar (matching mobile structure)
const primaryTabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'log' as Tab, label: 'Log', icon: ClipboardPlus, actualTab: 'games' as Tab },
  { id: 'progress' as Tab, label: 'Progress', icon: TrendingUp, actualTab: 'stats' as Tab },
  { id: 'coach' as Tab, label: 'Coach', icon: MessageCircle },
];

// Secondary tabs shown in the "More" dropdown (Schedule removed - now part of Log)
const moreTabs = [
  { id: 'clips' as Tab, label: 'Clips', icon: Video },
  { id: 'milestones' as Tab, label: 'Milestones', icon: Trophy },
  { id: 'minigames' as Tab, label: 'Play', icon: Gamepad2 },
  { id: 'settings' as Tab, label: 'Settings', icon: Settings },
];

// Helper to check if a tab is in the "More" menu (Schedule removed - now part of Log)
const isMoreTab = (tab: Tab): boolean => {
  return ['clips', 'milestones', 'minigames', 'settings', 'admin'].includes(tab);
};

// Map display tabs to actual tabs
const getActualTab = (tabId: Tab): Tab => {
  if (tabId === 'log') return 'games';
  if (tabId === 'progress') return 'stats';
  return tabId;
};

// Map actual tabs to display tabs for highlighting
const getDisplayTab = (actualTab: Tab): Tab => {
  if (actualTab === 'games') return 'log';
  if (actualTab === 'stats') return 'progress';
  return actualTab;
};

export function Navigation({ 
  activeTab, 
  onTabChange,
  seasons,
  activeSeason,
  onSeasonChange,
  onCreateSeason,
  onDeleteSeason,
  isAdmin = false,
}: NavigationProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const displayActiveTab = getDisplayTab(activeTab);

  const handleTabClick = (tabId: Tab) => {
    onTabChange(getActualTab(tabId));
  };

  const handleMoreItemClick = (tabId: Tab) => {
    onTabChange(tabId);
    setMoreMenuOpen(false);
  };

  // Build more tabs list (add admin if user is admin)
  const moreTabsList = isAdmin 
    ? [...moreTabs, { id: 'admin' as Tab, label: 'Admin', icon: Shield }]
    : moreTabs;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
              <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:block">
              Hoop Journal
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
            {primaryTabs.map((tab) => {
              const isActive = displayActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                    isActive
                      ? 'gradient-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* More Dropdown */}
            <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                    isMoreTab(activeTab)
                      ? 'gradient-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-popover border border-border shadow-lg z-50"
              >
                {moreTabsList.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <DropdownMenuItem
                      key={tab.id}
                      onClick={() => handleMoreItemClick(tab.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 cursor-pointer',
                        isActive && 'bg-primary/10 text-primary'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Season Selector */}
          <SeasonSelector
            seasons={seasons}
            activeSeason={activeSeason}
            onSeasonChange={onSeasonChange}
            onCreateSeason={onCreateSeason}
            onDeleteSeason={onDeleteSeason}
          />
        </div>
      </div>
    </nav>
  );
}
