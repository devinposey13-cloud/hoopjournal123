import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, UserPlus } from 'lucide-react';

interface GuestAccountGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestAccountGate({ open, onOpenChange }: GuestAccountGateProps) {
  const { exitGuestMode } = useAuth();

  const handleSignUp = () => {
    onOpenChange(false);
    exitGuestMode();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader className="text-center items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-lg font-bold">Account Required</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a free account to save your progress, sync your data across devices, and unlock all features.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button onClick={handleSignUp} className="w-full gradient-primary font-semibold">
            <UserPlus className="w-4 h-4 mr-2" />
            Sign Up Free
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Hook to easily trigger the gate modal from any component */
export function useGuestGate() {
  const { isGuest } = useAuth();
  const [gateOpen, setGateOpen] = useState(false);

  /** Call before any account-based action. Returns true if the action is blocked (guest). */
  const guardAction = (): boolean => {
    if (isGuest) {
      setGateOpen(true);
      return true;
    }
    return false;
  };

  return { isGuest, gateOpen, setGateOpen, guardAction };
}
