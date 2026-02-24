import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UsageMeter } from './UsageMeter';
import { Crown, CreditCard, Calendar, Sparkles, Mic, FileText, Clock } from 'lucide-react';
import { planCatalog, type PlanId, type UsageData } from '@/lib/plans';
import { useNavigate } from 'react-router-dom';

interface BillingSummaryCardProps {
  currentPlan: PlanId;
  usage: UsageData;
}

export function BillingSummaryCard({ currentPlan, usage }: BillingSummaryCardProps) {
  const navigate = useNavigate();
  const plan = planCatalog[currentPlan];
  const limits = plan.limits;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Current Plan
            </CardTitle>
            <Badge className={currentPlan === 'free' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}>
              {plan.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{plan.tagline}</p>
          
          {currentPlan !== 'free' && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Renews on March 24, 2026</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">•••• 4242</span>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {currentPlan === 'free' ? (
              <Button onClick={() => navigate('/pricing')} className="gradient-primary">
                Upgrade
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Manage Subscription
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/pricing')}>
              See plans
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageMeter
            label="AI Recaps"
            used={usage.aiRecapsUsed}
            limit={limits.aiRecapsPerMonth === Infinity ? null : limits.aiRecapsPerMonth}
            icon={<Sparkles className="w-4 h-4 text-primary" />}
          />
          <Separator />
          <UsageMeter
            label="Pregame Talks"
            used={usage.pregameTalksUsed}
            limit={limits.pregameTalksPerMonth === Infinity ? null : limits.pregameTalksPerMonth}
            icon={<Mic className="w-4 h-4 text-primary" />}
          />
          <Separator />
          <UsageMeter
            label="Season Reports"
            used={usage.seasonReportsGenerated}
            limit={limits.seasonReports ? null : 0}
            icon={<FileText className="w-4 h-4 text-primary" />}
          />
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">History Visibility</span>
            </div>
            <Badge variant="secondary">
              {limits.historyDays ? `${limits.historyDays} days` : 'Unlimited'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
