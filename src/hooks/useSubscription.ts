import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { type PlanId, type BillingCycle, STRIPE_PLAN_IDS } from '@/lib/plans';
import { isNativeApp } from '@/lib/platform';

export interface SubscriptionState {
  isSubscribed: boolean;
  planType: PlanId | null;
  subscriptionEnd: string | null;
  subscriptionStatus: string | null;
  billingCycle: 'month' | 'year' | null;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    planType: null,
    subscriptionEnd: null,
    subscriptionStatus: null,
    billingCycle: null,
    cancelAtPeriodEnd: false,
    isLoading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({
        isSubscribed: false,
        planType: null,
        subscriptionEnd: null,
        subscriptionStatus: null,
        billingCycle: null,
        cancelAtPeriodEnd: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;

      setState({
        isSubscribed: data.subscribed || false,
        planType: (data.plan_type as PlanId) || null,
        subscriptionEnd: data.subscription_end || null,
        subscriptionStatus: data.subscription_status || null,
        billingCycle: data.billing_cycle || null,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to check subscription',
      }));
    }
  }, [user]);

  const createCheckout = async (planId: PlanId, billingCycle: BillingCycle = 'monthly', source?: string) => {
    if (!user) throw new Error('Must be logged in to subscribe');

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { planId, billingCycle, source },
    });

    if (error) throw error;

    if (data.url) {
      // Mobile browsers block window.open after async calls — redirect in same tab instead
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
      if (isMobile) {
        window.location.href = data.url;
      } else {
        window.open(data.url, '_blank');
      }
    }

    return data;
  };

  const openCustomerPortal = async () => {
    if (!user) throw new Error('Must be logged in to manage subscription');

    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) throw error;

    if (data.url) {
      window.open(data.url, '_blank');
    }

    return data;
  };

  const cancelSubscription = async (immediate = false) => {
    if (!user) throw new Error('Must be logged in to cancel subscription');

    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: { immediate },
    });

    if (error) throw error;

    // Refresh subscription state after cancellation
    await checkSubscription();

    return data;
  };

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    cancelSubscription,
  };
}
