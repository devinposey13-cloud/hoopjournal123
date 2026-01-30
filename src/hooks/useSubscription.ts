import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Price IDs from Stripe
export const SUBSCRIPTION_TIERS = {
  monthly: {
    price_id: "price_1SvKZNRmEndXycaGjqXeIVXg",
    product_id: "prod_Tt6msL89CTmjZA",
    price: 4.99,
    interval: "month",
  },
  annual: {
    price_id: "price_1SvKgjRmEndXycaGRatSCc0m",
    product_id: "prod_Tt6ugFMBjcSxU8",
    price: 39.99,
    interval: "year",
  }
} as const;

// 7-day free trial in days
export const FREE_TRIAL_DAYS = 7;

interface SubscriptionState {
  isSubscribed: boolean;
  planType: string | null;
  subscriptionEnd: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    planType: null,
    subscriptionEnd: null,
    isLoading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({
        isSubscribed: false,
        planType: null,
        subscriptionEnd: null,
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
        planType: data.plan_type || null,
        subscriptionEnd: data.subscription_end || null,
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

  const createCheckout = async (priceId: string, withTrial: boolean = false) => {
    if (!user) {
      throw new Error('Must be logged in to subscribe');
    }

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId, withTrial },
    });

    if (error) throw error;
    
    if (data.url) {
      window.open(data.url, '_blank');
    }

    return data;
  };

  const openCustomerPortal = async () => {
    if (!user) {
      throw new Error('Must be logged in to manage subscription');
    }

    const { data, error } = await supabase.functions.invoke('customer-portal');

    if (error) throw error;

    if (data.url) {
      window.open(data.url, '_blank');
    }

    return data;
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh subscription status periodically (every 60 seconds)
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
  };
}
