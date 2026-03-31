import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { BillingSummaryCard } from '@/components/billing/BillingSummaryCard';
import { PurchaseConfirmationDialog } from '@/components/purchase/PurchaseConfirmationDialog';
import { usePlan } from '@/hooks/usePlanState';
import { useSubscription } from '@/hooks/useSubscription';
import { planCatalog } from '@/lib/plans';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentPlan, usage, accessBadge, loading } = usePlan();
  const { isSubscribed, subscriptionEnd, subscriptionStatus, billingSource, checkSubscription, openCustomerPortal, cancelSubscription } = useSubscription();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedPlanName, setConfirmedPlanName] = useState('');
  const pollingRef = useRef(false);

  // Handle Stripe redirect success — poll until webhook updates plan
  useEffect(() => {
    if (searchParams.get('success') !== 'true' || pollingRef.current) return;
    pollingRef.current = true;

    // Clear the query param immediately so refresh doesn't re-trigger
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('success');
    setSearchParams(newParams, { replace: true });

    let attempts = 0;
    const maxAttempts = 12; // ~30 seconds
    const poll = async () => {
      attempts++;
      console.log(`[Billing] Polling for subscription update (${attempts}/${maxAttempts})…`);
      await checkSubscription();

      // Check if plan updated (usePlan will re-render with new currentPlan)
      // We can't read currentPlan here directly since it's stale in the closure,
      // so we just poll and let the effect below detect the plan change
      if (attempts < maxAttempts) {
        setTimeout(poll, 2500);
      } else {
        // Even after max attempts, show confirmation — webhook may still be processing
        console.log('[Billing] Max poll attempts reached — showing confirmation anyway');
        setConfirmedPlanName('your new plan');
        setShowConfirmation(true);
      }
    };

    toast.success("Purchase complete! Activating your plan…");
    poll();
  }, [searchParams]);

  // Detect when currentPlan changes to a paid plan after success polling
  useEffect(() => {
    if (pollingRef.current && currentPlan !== 'free') {
      pollingRef.current = false;
      const name = planCatalog[currentPlan]?.name || 'your plan';
      setConfirmedPlanName(name);
      setShowConfirmation(true);
    }
  }, [currentPlan]);

  const handleCancel = async (immediate: boolean) => {
    // App Store subscribers must cancel through Apple, not Stripe
    if (billingSource === 'ios_app_store') {
      const { isDespia } = await import('@/lib/platform');
      if (isDespia()) {
        try {
          const despiaModule = await import('despia-native');
          const despia = (despiaModule.default || despiaModule) as any;
          despia('managesubscriptions://');
        } catch {
          window.open('https://apps.apple.com/account/subscriptions', '_blank');
        }
      } else {
        const url = 'https://apps.apple.com/account/subscriptions';
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) window.location.href = url;
      }
      toast.info('Opening App Store subscription management…');
      setCancelOpen(false);
      return;
    }

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
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Return to Dashboard
          </Button>
        </div>
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

      <PurchaseConfirmationDialog
        open={showConfirmation}
        planName={confirmedPlanName}
        onGoToDashboard={() => {
          setShowConfirmation(false);
          navigate('/');
        }}
      />
    </div>
  );
}
