import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BillingSummaryCard } from '@/components/billing/BillingSummaryCard';
import { type PlanId, mockUsage } from '@/lib/plans';

export default function Billing() {
  const navigate = useNavigate();
  // Mock current plan
  const currentPlan: PlanId = 'free';

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
        <BillingSummaryCard currentPlan={currentPlan} usage={mockUsage} />
      </div>
    </div>
  );
}
