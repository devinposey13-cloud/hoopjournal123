import { useState } from 'react';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, Trash2, Check, X, Users, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AddProfileDialog } from '@/components/profile/AddProfileDialog';

interface ProfileManagementProps {
  onProfileCreated?: (profileId: string) => void;
}

export function ProfileManagement({ onProfileCreated }: ProfileManagementProps) {
  const { profiles, activeProfile, switchProfile, deleteProfile, refetchProfiles } = useActiveProfile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddProfileDialog, setShowAddProfileDialog] = useState(false);

  const handleStartEdit = (profileId: string, currentName: string) => {
    setEditingId(profileId);
    setEditName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = async (profileId: string) => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('player_settings')
        .update({ name: editName.trim(), display_name: editName.trim() })
        .eq('id', profileId);

      if (error) throw error;

      toast.success('Profile renamed successfully');
      setEditingId(null);
      setEditName('');
      refetchProfiles();
    } catch (error) {
      console.error('Error renaming profile:', error);
      toast.error('Failed to rename profile');
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      toast.error('Cannot delete your only profile');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProfile(profileId);
      toast.success('Profile deleted successfully');
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Failed to delete profile');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProfileCreated = (profileId: string) => {
    setShowAddProfileDialog(false);
    onProfileCreated?.(profileId);
  };

  return (
    <>
      <div className="stat-card bg-secondary/30 p-4 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Player Profiles
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddProfileDialog(true)}
            className="h-8 text-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Player
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {profiles.length === 1 
            ? "Add additional player profiles for siblings or other athletes."
            : "Switch between profiles, rename, or delete player profiles."}
        </p>

      <div className="space-y-3">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfile?.id;
          const isEditing = editingId === profile.id;
          const displayName = profile.display_name || profile.name;

          return (
            <div
              key={profile.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-background/50'
              }`}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(profile.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600"
                      onClick={() => handleSaveEdit(profile.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={handleCancelEdit}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-sm truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.position} • #{profile.number}
                      {isActive && <span className="ml-2 text-primary">(Active)</span>}
                    </p>
                  </>
                )}
              </div>

              {!isEditing && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleStartEdit(profile.id, displayName)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  {!isActive && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Profile?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>{displayName}</strong>'s profile 
                            and all associated data including games, stats, and progress. 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDeleteProfile(profile.id)}
                          >
                            Delete Profile
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* Add Profile Dialog */}
    <AddProfileDialog
      open={showAddProfileDialog}
      onOpenChange={setShowAddProfileDialog}
      onProfileCreated={handleProfileCreated}
    />
  </>
  );
}
