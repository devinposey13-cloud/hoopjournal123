import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BillingSummaryCard } from '@/components/billing/BillingSummaryCard';
import { usePlan } from '@/hooks/usePlanState';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentPlan, usage, accessBadge, loading } = usePlan();
  const { isSubscribed, subscriptionEnd, subscriptionStatus, checkSubscription, openCustomerPortal } = useSubscription();

  // Handle Stripe redirect success
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success("You're now upgraded! 🎉");
      checkSubscription();
    }
  }, []);

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
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
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
        />
      </div>
    </div>
  );
}
