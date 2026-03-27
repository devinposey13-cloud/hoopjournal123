import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { planCatalog, type PlanId } from '@/lib/plans';

interface PurchaseConfirmationDialogProps {
  open: boolean;
  planName?: string;
  onGoToDashboard?: () => void;
}

export function PurchaseConfirmationDialog({ open, planName, onGoToDashboard }: PurchaseConfirmationDialogProps) {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (onGoToDashboard) {
      onGoToDashboard();
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (!open) return;
    timerRef.current = setTimeout(handleGo, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm text-center">
        <AlertDialogHeader className="items-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <AlertDialogTitle className="text-xl">
            Welcome to {planName || 'your new plan'}! 🎉
          </AlertDialogTitle>
          <AlertDialogDescription>
            You now have access to all {planName || 'premium'} features. Let's get back to your journal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center sm:justify-center">
          <Button onClick={handleGo} className="w-full">
            Go to Dashboard
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
