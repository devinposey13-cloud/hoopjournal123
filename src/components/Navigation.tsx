import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ClipboardPlus, TrendingUp, MessageCircle, MoreHorizontal, Gamepad2, Settings, Shield, CalendarRange, UserCircle, LogOut, UserPlus, HelpCircle, MessageSquare } from 'lucide-react';
import hoopJournalLogo from '@/assets/hoop-journal-logo-v2.png';
import { SeasonSelector } from './SeasonSelector';
import { ProfileSelector } from './profile/ProfileSelector';
import { AddProfileDialog } from './profile/AddProfileDialog';
import { FeedbackDialog } from './FeedbackDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Season } from '@/types/basketball';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export type Tab = 'dashboard' | 'log' | 'progress' | 'games' | 'stats' | 'schedule' | 'minigames' | 'coach' | 'settings' | 'admin' | 'profile';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
  onDeleteSeason?: (seasonId: string) => Promise<boolean>;
  isAdmin?: boolean;
  adminNotificationCount?: number;
  onProfileCreated?: (profileId: string) => void;
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
  { id: 'profile' as Tab, label: 'Profile', icon: UserCircle, route: '/profile' },
  { id: 'minigames' as Tab, label: 'Play', icon: Gamepad2 },
  { id: 'settings' as Tab, label: 'Settings', icon: Settings },
];

// Helper to check if a tab is in the "More" menu
const isMoreTab = (tab: Tab): boolean => {
  return ['profile', 'minigames', 'settings', 'admin'].includes(tab);
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
  adminNotificationCount = 0,
  onProfileCreated,
}: NavigationProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showAddProfileDialog, setShowAddProfileDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { activeProfile, hasMultipleProfiles } = useActiveProfile();

  // Derive display values from active profile
  const displayName = activeProfile?.display_name || activeProfile?.name || 'Player';
  const positionShort = activeProfile?.position
    ? activeProfile.position.replace('Point Guard', 'PG').replace('Shooting Guard', 'SG').replace('Combo Guard', 'CG').replace('Small Forward', 'SF').replace('Power Forward', 'PF').replace('Center', 'C')
    : '';
  const jerseyNumber = activeProfile?.number != null ? `#${activeProfile.number}` : '';
  const profileSubtitle = [positionShort, jerseyNumber].filter(Boolean).join(' · ');

  const handleSignOut = async () => {
    await signOut();
    setMoreMenuOpen(false);
  };

  const handleAddProfile = () => {
    setShowAddProfileDialog(true);
    setMoreMenuOpen(false);
  };

  const handleProfileCreated = (profileId: string) => {
    setShowAddProfileDialog(false);
    onProfileCreated?.(profileId);
  };

  // Check if we're on a /log or /progress route
  const isLogRoute = location.pathname.startsWith('/log');
  const isProgressRoute = location.pathname.startsWith('/progress');
  const displayActiveTab = isLogRoute ? 'log' : isProgressRoute ? 'progress' : getDisplayTab(activeTab);

  const handleTabClick = (tab: typeof primaryTabs[0]) => {
    // Always update the active tab state first
    onTabChange(getActualTab(tab.id));
    // Then navigate if there's a route
    if (tab.route) {
      navigate(tab.route);
    }
  };

  const handleMoreItemClick = (item: typeof moreTabs[0]) => {
    if ('route' in item && item.route) {
      navigate(item.route);
    } else {
      onTabChange(item.id);
    }
    setMoreMenuOpen(false);
  };

  // Build more tabs list (add admin if user is admin)
  const moreTabsList = isAdmin 
    ? [...moreTabs, { id: 'admin' as Tab, label: 'Admin', icon: Shield }]
    : moreTabs;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Logo - fixed width for balance */}
          <div className="flex items-center gap-3 w-48">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
              <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:block">
              Hoop Journal™
            </span>
          </div>

          {/* Navigation Tabs - centered */}
          <div className="flex-1 flex justify-center">
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
                className="w-72 bg-popover border border-border shadow-lg z-50"
              >
                {/* Player Identity Header */}
                <div className="flex items-center gap-3 px-3 py-3">
                  <Avatar className="w-10 h-10 border-2 border-border">
                    <AvatarImage src={activeProfile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
                    {profileSubtitle && (
                      <p className="text-xs text-muted-foreground">{profileSubtitle}</p>
                    )}
                  </div>
                  {hasMultipleProfiles && (
                    <ProfileSelector onAddProfile={handleAddProfile} compact />
                  )}
                </div>

                <DropdownMenuSeparator />

                {/* PLAYER Section */}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 py-1">
                  Player
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleMoreItemClick({ id: 'profile' as Tab, label: 'Profile', icon: UserCircle, route: '/profile' })}
                  className={cn('flex items-center gap-3 px-3 py-2.5 cursor-pointer', activeTab === 'profile' && 'bg-primary/10 text-primary')}
                >
                  <UserCircle className="w-4 h-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleAddProfile}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Player</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* APP Section */}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 py-1">
                  App
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleMoreItemClick({ id: 'settings' as Tab, label: 'Settings', icon: Settings })}
                  className={cn('flex items-center gap-3 px-3 py-2.5 cursor-pointer', activeTab === 'settings' && 'bg-primary/10 text-primary')}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleMoreItemClick({ id: 'minigames' as Tab, label: 'Play', icon: Gamepad2 })}
                  className={cn('flex items-center gap-3 px-3 py-2.5 cursor-pointer', activeTab === 'minigames' && 'bg-primary/10 text-primary')}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Play</span>
                </DropdownMenuItem>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <CalendarRange className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1">Season</span>
                  <SeasonSelector
                    seasons={seasons}
                    activeSeason={activeSeason}
                    onSeasonChange={onSeasonChange}
                    onCreateSeason={onCreateSeason}
                    onDeleteSeason={onDeleteSeason}
                  />
                </div>

                {/* ADMIN Section (conditional) */}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 py-1">
                      Admin
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleMoreItemClick({ id: 'admin' as Tab, label: 'Admin Console', icon: Shield })}
                      className={cn('flex items-center gap-3 px-3 py-2.5 cursor-pointer', activeTab === 'admin' && 'bg-primary/10 text-primary')}
                    >
                      <Shield className="w-4 h-4" />
                      <span className="flex-1">Admin Console</span>
                      {adminNotificationCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center px-1 text-xs">
                          {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                {/* SUPPORT Section */}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 py-1">
                  Support
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    window.open('mailto:support@hoopjournal.me', '_blank');
                    setMoreMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help Center</span>
                </DropdownMenuItem>
                <div className="px-1 [&_button]:w-full [&_button]:justify-start [&_button]:gap-3 [&_button]:px-2 [&_button]:py-2.5 [&_button]:h-auto [&_button]:rounded-sm [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-foreground [&_button]:hover:bg-accent [&_button]:font-normal [&_button]:text-sm">
                  <FeedbackDialog />
                </div>

                <DropdownMenuSeparator />

                {/* ACCOUNT Section */}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 py-1">
                  Account
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          </div>

          {/* Spacer for balance */}
          <div className="w-48" />
        </div>
      </div>

      {/* Add Profile Dialog */}
      <AddProfileDialog
        open={showAddProfileDialog}
        onOpenChange={setShowAddProfileDialog}
        onProfileCreated={handleProfileCreated}
      />
    </nav>
  );
}
