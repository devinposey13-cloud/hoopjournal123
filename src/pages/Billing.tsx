import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { BillingSummaryCard } from '@/components/billing/BillingSummaryCard';
import { usePlan } from '@/hooks/usePlanState';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentPlan, usage, accessBadge, loading } = usePlan();
  const { isSubscribed, subscriptionEnd, subscriptionStatus, checkSubscription, openCustomerPortal, cancelSubscription } = useSubscription();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Handle Stripe redirect success
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success("You're now upgraded! 🎉");
      checkSubscription();
    }
  }, []);

  const handleCancel = async (immediate: boolean) => {
    setCanceling(true);
    try {
      const result = await cancelSubscription(immediate);
      toast.success(result.message || 'Subscription canceled');
      setCancelOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-lg">
        <h1 className="text-2xl font-bold mb-6">Billing</h1>
        <BillingSummaryCard
          currentPlan={currentPlan}
          usage={usage}
          accessBadge={accessBadge}
          isSubscribed={isSubscribed}
          subscriptionEnd={subscriptionEnd}
          subscriptionStatus={subscriptionStatus}
          onManageSubscription={openCustomerPortal}
          onCancelSubscription={() => setCancelOpen(true)}
        />
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              How would you like to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={canceling}
              onClick={() => handleCancel(false)}
            >
              {canceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Cancel at end of billing period
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              disabled={canceling}
              onClick={() => handleCancel(true)}
            >
              {canceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Cancel immediately
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Keep Subscription</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
