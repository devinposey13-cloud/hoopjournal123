import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LogOut, Settings, Shield, UserCircle, UserPlus, Calendar,
  HelpCircle, MessageSquare, Gamepad2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SeasonSelector } from './SeasonSelector';
import { ProfileSelector } from './profile/ProfileSelector';
import { AddProfileDialog } from './profile/AddProfileDialog';
import { FeedbackDialog } from './FeedbackDialog';
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
  onProfileCreated?: (profileId: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1 pt-1 pb-0.5">
      {children}
    </p>
  );
}

interface MenuRowProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  badge?: number;
  variant?: 'default' | 'destructive';
}

function MenuRow({ icon: Icon, label, onClick, isActive, badge, variant = 'default' }: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/10'
          : isActive
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-secondary/70'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge != null && badge > 0 && (
        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center px-1.5 text-xs">
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
    </button>
  );
}

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
  onProfileCreated,
}: MoreMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { activeProfile, hasMultipleProfiles } = useActiveProfile();
  const [showAddProfileDialog, setShowAddProfileDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  const go = (tab: Tab, route?: string) => {
    if (route) {
      navigate(route);
      onOpenChange(false);
    } else {
      onSelect(tab);
    }
  };

  const handleAddProfile = () => {
    setShowAddProfileDialog(true);
  };

  const handleProfileCreated = (profileId: string) => {
    setShowAddProfileDialog(false);
    onOpenChange(false);
    onProfileCreated?.(profileId);
  };

  // Derive display values from active profile
  const displayName = activeProfile?.display_name || activeProfile?.name || 'Player';
  const positionShort = activeProfile?.position
    ? activeProfile.position.replace('Point Guard', 'PG').replace('Shooting Guard', 'SG').replace('Combo Guard', 'CG').replace('Small Forward', 'SF').replace('Power Forward', 'PF').replace('Center', 'C')
    : '';
  const jerseyNumber = activeProfile?.number != null ? `#${activeProfile.number}` : '';
  const subtitle = [positionShort, jerseyNumber].filter(Boolean).join(' · ');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>

          {/* ── Player Identity Header ── */}
          <div className="flex items-center gap-3 pb-4">
            <Avatar className="w-12 h-12 border-2 border-border">
              <AvatarImage src={activeProfile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {hasMultipleProfiles && (
              <ProfileSelector onAddProfile={handleAddProfile} compact />
            )}
          </div>

          <Separator className="mb-4" />

          {/* ── PLAYER Section ── */}
          <div className="space-y-0.5 mb-3">
            <SectionLabel>Player</SectionLabel>
            <MenuRow
              icon={UserCircle}
              label="Profile"
              isActive={activeTab === 'profile'}
              onClick={() => go('profile', '/profile')}
            />
            <MenuRow
              icon={UserPlus}
              label="Add Player"
              onClick={handleAddProfile}
            />
          </div>

          {/* ── APP Section ── */}
          <div className="space-y-0.5 mb-3">
            <SectionLabel>App</SectionLabel>
            <MenuRow
              icon={Settings}
              label="Settings"
              isActive={activeTab === 'settings'}
              onClick={() => go('settings')}
            />
            <MenuRow
              icon={Gamepad2}
              label="Play"
              isActive={activeTab === 'minigames'}
              onClick={() => go('minigames')}
            />
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">Select Season</span>
              </div>
              <SeasonSelector
                seasons={seasons}
                activeSeason={activeSeason}
                onSeasonChange={onSeasonChange}
                onCreateSeason={onCreateSeason}
                onDeleteSeason={onDeleteSeason}
              />
            </div>
          </div>

          {/* ── ADMIN Section (conditional) ── */}
          {isAdmin && (
            <div className="space-y-0.5 mb-3">
              <SectionLabel>Admin</SectionLabel>
              <MenuRow
                icon={Shield}
                label="Admin Console"
                isActive={activeTab === 'admin'}
                badge={adminNotificationCount}
                onClick={() => go('admin')}
              />
            </div>
          )}

          {/* ── SUPPORT Section ── */}
          <div className="space-y-0.5 mb-3">
            <SectionLabel>Support</SectionLabel>
            <MenuRow
              icon={HelpCircle}
              label="Help Center"
              onClick={() => {
                window.open('mailto:support@hoopjournal.me', '_blank');
                onOpenChange(false);
              }}
            />
            <MenuRow
              icon={MessageSquare}
              label="Send Feedback"
              onClick={() => setShowFeedback(true)}
            />
          </div>

          {/* ── ACCOUNT Section ── */}
          <Separator className="my-3" />
          <div className="space-y-0.5 pb-2">
            <SectionLabel>Account</SectionLabel>
            <MenuRow
              icon={LogOut}
              label="Sign Out"
              variant="destructive"
              onClick={handleSignOut}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Profile Dialog */}
      <AddProfileDialog
        open={showAddProfileDialog}
        onOpenChange={setShowAddProfileDialog}
        onProfileCreated={handleProfileCreated}
      />

      {/* Feedback Dialog triggered from menu */}
      {showFeedback && (
        <FeedbackDialog
          triggerless
          open={showFeedback}
          onOpenChange={setShowFeedback}
        />
      )}
    </>
  );
}
