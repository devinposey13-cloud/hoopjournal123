import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, Loader2, Crown, Zap } from 'lucide-react';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const FREE_FEATURES = [
  'Basic game logging',
  '10 games per season',
  'Season stats overview',
  'Basic charts',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited games',
  'AI Coach Chat',
  'Video clip storage',
  'Advanced analytics',
  'Player comparison tool',
  'Priority support',
  'Trading card generator',
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed, planType, isLoading, createCheckout } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (tier: 'monthly' | 'annual') => {
    if (!user) {
      toast.error('Please log in to subscribe');
      navigate('/');
      return;
    }

    setLoadingPlan(tier);
    try {
      await createCheckout(SUBSCRIPTION_TIERS[tier].price_id);
      toast.success('Redirecting to checkout...');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Journal
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Level up your game with Hoop Journal Pro. Unlock AI coaching, unlimited games, 
            and advanced analytics to become a better player.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <Card className="relative border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Free
                </CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {!isSubscribed ? (
                  <Badge variant="secondary" className="w-full justify-center py-2">
                    Current Plan
                  </Badge>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Free Tier
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Pro Tier */}
            <Card className="relative border-2 border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-1">
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Pro
                </CardTitle>
                <CardDescription>For serious ballers</CardDescription>
                <div className="mt-4 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">${SUBSCRIPTION_TIERS.monthly.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    or ${SUBSCRIPTION_TIERS.annual.price}/year <Badge variant="secondary" className="ml-1">Save 33%</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {isSubscribed ? (
                  <Badge className="w-full justify-center py-2 bg-green-500/10 text-green-600 border-green-500/20">
                    <Check className="w-4 h-4 mr-1" />
                    {planType === 'annual' ? 'Annual' : 'Monthly'} - Active
                  </Badge>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe('monthly')}
                      disabled={loadingPlan !== null}
                    >
                      {loadingPlan === 'monthly' ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Subscribe Monthly
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSubscribe('annual')}
                      disabled={loadingPlan !== null}
                    >
                      {loadingPlan === 'annual' ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Subscribe Annually (Save 33%)
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          </div>
        )}

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at support@hoopjournal.me
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            All subscriptions are billed securely through Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
