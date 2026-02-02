import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ClipboardPlus, TrendingUp, MessageCircle, MoreHorizontal, Gamepad2, Settings, Shield, CalendarRange } from 'lucide-react';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';
import { SeasonSelector } from './SeasonSelector';
import { Season } from '@/types/basketball';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 'schedule' | 'minigames' | 'coach' | 'settings' | 'admin';

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

// Primary tabs shown in the main nav bar - only core features
const primaryTabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard, route: '/' },
  { id: 'log' as Tab, label: 'Log', icon: ClipboardPlus, route: '/log/history', actualTab: 'games' as Tab },
  { id: 'progress' as Tab, label: 'Progress', icon: TrendingUp, route: '/progress/overview', actualTab: 'stats' as Tab },
  { id: 'coach' as Tab, label: 'Coach', icon: MessageCircle },
];

// Secondary tabs shown in the "More" dropdown
const moreTabs = [
  { id: 'minigames' as Tab, label: 'Play', icon: Gamepad2 },
  { id: 'settings' as Tab, label: 'Settings', icon: Settings },
];

// Helper to check if a tab is in the "More" menu
const isMoreTab = (tab: Tab): boolean => {
  return ['minigames', 'settings', 'admin'].includes(tab);
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
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on a /log or /progress route
  const isLogRoute = location.pathname.startsWith('/log');
  const isProgressRoute = location.pathname.startsWith('/progress');
  const displayActiveTab = isLogRoute ? 'log' : isProgressRoute ? 'progress' : getDisplayTab(activeTab);

  const handleTabClick = (tab: typeof primaryTabs[0]) => {
    if (tab.route) {
      navigate(tab.route);
    } else {
      onTabChange(getActualTab(tab.id));
    }
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
                  onClick={() => handleTabClick(tab)}
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
                className="w-64 bg-popover border border-border shadow-lg z-50"
              >
                {/* Menu Items */}
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-3 py-1.5">
                  Features
                </DropdownMenuLabel>
                {moreTabsList.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <DropdownMenuItem
                      key={tab.id}
                      onClick={() => handleMoreItemClick(tab.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 cursor-pointer',
                        isActive && 'bg-primary/10 text-primary'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </DropdownMenuItem>
                  );
                })}

                {/* Season Selector Section */}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-3 py-1.5">
                  Season
                </DropdownMenuLabel>
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-muted-foreground" />
                    <SeasonSelector
                      seasons={seasons}
                      activeSeason={activeSeason}
                      onSeasonChange={onSeasonChange}
                      onCreateSeason={onCreateSeason}
                      onDeleteSeason={onDeleteSeason}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Empty div for layout balance (season selector moved to More menu) */}
          <div className="w-10" />
        </div>
      </div>
    </nav>
  );
}
