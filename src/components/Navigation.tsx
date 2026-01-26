import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Video, Settings, CalendarDays, MessageCircle } from 'lucide-react';

export type Tab = 'dashboard' | 'games' | 'schedule' | 'clips' | 'coach' | 'settings';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'games' as Tab, label: 'Games', icon: Calendar },
  { id: 'schedule' as Tab, label: 'Schedule', icon: CalendarDays },
  { id: 'clips' as Tab, label: 'Clips', icon: Video },
  { id: 'coach' as Tab, label: 'Coach', icon: MessageCircle },
  { id: 'settings' as Tab, label: 'Settings', icon: Settings },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-lg font-black text-primary-foreground">🏀</span>
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:block">
              HoopStats
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
        </div>
      </div>
    </nav>
  );
}
