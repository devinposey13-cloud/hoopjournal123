import { useState } from 'react';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Plus, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileSelectorProps {
  onAddProfile?: () => void;
  compact?: boolean;
  className?: string;
}

export function ProfileSelector({ onAddProfile, compact = false, className }: ProfileSelectorProps) {
  const { activeProfile, profiles, switchProfile, hasMultipleProfiles, loading } = useActiveProfile();

  // Don't show selector if only one profile and compact mode
  if (!hasMultipleProfiles && compact) {
    return null;
  }

  if (loading || !activeProfile) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 h-auto',
            compact ? 'text-sm' : 'text-base',
            className
          )}
        >
          <Avatar className={cn(compact ? 'h-6 w-6' : 'h-8 w-8')}>
            {activeProfile.avatar_url ? (
              <AvatarImage src={activeProfile.avatar_url} alt={activeProfile.name} />
            ) : null}
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(activeProfile.name)}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <>
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm leading-tight">{activeProfile.name}</span>
                {hasMultipleProfiles && (
                  <span className="text-xs text-muted-foreground leading-tight">
                    {profiles.length} profiles
                  </span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
            </>
          )}
          {compact && hasMultipleProfiles && (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          Player Profiles
        </div>
        <DropdownMenuSeparator />
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => {
              if (profile.id !== activeProfile.id) {
                switchProfile(profile.id);
              }
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Avatar className="h-7 w-7">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
              ) : null}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{profile.name}</div>
              <div className="text-xs text-muted-foreground truncate">{profile.team}</div>
            </div>
            {profile.id === activeProfile.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        {onAddProfile && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onAddProfile}
              className="flex items-center gap-2 cursor-pointer text-primary"
            >
              <div className="h-7 w-7 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
              <span className="font-medium">Add Player</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
