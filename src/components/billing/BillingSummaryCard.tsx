import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UsageMeter } from './UsageMeter';
import { Crown, CreditCard, Calendar, Sparkles, Mic, FileText, Clock, Star, Shield, Zap } from 'lucide-react';
import { planCatalog, type PlanId, type UsageData, type AccessBadge } from '@/lib/plans';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface BillingSummaryCardProps {
  currentPlan: PlanId;
  usage: UsageData;
  accessBadge?: AccessBadge;
}

export function BillingSummaryCard({ currentPlan, usage, accessBadge }: BillingSummaryCardProps) {
  const navigate = useNavigate();
  const plan = planCatalog[currentPlan];
  const limits = plan.limits;

  return (
    <div className="space-y-6">
      {/* Special access banner */}
      {accessBadge && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {accessBadge.type === 'grandfathered' && <Star className="w-5 h-5 text-amber-500" />}
              {accessBadge.type === 'admin_override' && <Shield className="w-5 h-5 text-primary" />}
              {accessBadge.type === 'promo' && <Zap className="w-5 h-5 text-primary" />}
              <div>
                <p className="font-semibold text-sm">{accessBadge.label}</p>
                {accessBadge.type === 'grandfathered' && (
                  <p className="text-xs text-muted-foreground">You have full access as an early supporter.</p>
                )}
                {accessBadge.type === 'promo' && (
                  <p className="text-xs text-muted-foreground">
                    Expires {format(new Date(accessBadge.expiresAt), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          
          {currentPlan !== 'free' && !accessBadge && (
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

          {!accessBadge && (
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
          )}
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
