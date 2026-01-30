import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Video, Settings, CalendarDays, MessageCircle, Shield, Gamepad2, Trophy } from 'lucide-react';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';
import { SeasonSelector } from './SeasonSelector';
import { Season } from '@/types/basketball';

export type Tab = 'dashboard' | 'games' | 'schedule' | 'clips' | 'milestones' | 'minigames' | 'coach' | 'settings' | 'admin';

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

const baseTabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'games' as Tab, label: 'Games', icon: Calendar },
  { id: 'schedule' as Tab, label: 'Schedule', icon: CalendarDays },
  { id: 'clips' as Tab, label: 'Clips', icon: Video },
  { id: 'milestones' as Tab, label: 'Milestones', icon: Trophy },
  { id: 'minigames' as Tab, label: 'Play', icon: Gamepad2 },
  { id: 'coach' as Tab, label: 'Coach', icon: MessageCircle },
  { id: 'settings' as Tab, label: 'Settings', icon: Settings },
];

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
  const tabs = isAdmin 
    ? [...baseTabs, { id: 'admin' as Tab, label: 'Admin', icon: Shield }]
    : baseTabs;
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'gradient-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            ))}
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
