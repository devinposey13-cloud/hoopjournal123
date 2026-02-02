import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Users, Plus, Loader2 } from 'lucide-react';

interface AddProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileCreated: (profileId: string) => void;
}

export function AddProfileDialog({ open, onOpenChange, onProfileCreated }: AddProfileDialogProps) {
  const { createProfile, profiles } = useActiveProfile();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProfile = async () => {
    setIsCreating(true);
    try {
      const newProfileId = await createProfile();
      if (newProfileId) {
        onOpenChange(false);
        onProfileCreated(newProfileId);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Add Player Profile
          </DialogTitle>
          <DialogDescription>
            Create a new player profile for another athlete. Each profile has its own stats, games, and progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Current profiles summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              You currently have <span className="font-medium text-foreground">{profiles.length}</span> {profiles.length === 1 ? 'profile' : 'profiles'}.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2 text-sm">
            <p className="font-medium">Perfect for:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
              <li>Parents managing multiple kids</li>
              <li>Players on multiple teams</li>
              <li>Coaches tracking different athletes</li>
            </ul>
          </div>

          {/* Action */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProfile} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
