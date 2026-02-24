import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import {
  PlanId, PaywallReason, paywallConfigs, mockUsage, UsageData, track,
  UserAccessInfo, getEffectivePlan, hasSpecialAccess, getAccessBadge, AccessBadge,
  PRICING_LAUNCH_DATE,
} from '@/lib/plans';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PlanState {
  currentPlan: PlanId; // effective plan (computed)
  subscriptionPlan: PlanId; // raw subscription
  accessInfo: UserAccessInfo;
  accessBadge: AccessBadge;
  usage: UsageData;
  paywallOpen: boolean;
  paywallReason: PaywallReason | null;
  loading: boolean;
  setCurrentPlan: (plan: PlanId) => void;
  openPaywall: (reason: PaywallReason) => void;
  closePaywall: () => void;
}

const defaultAccessInfo: UserAccessInfo = {
  subscriptionPlan: 'free',
  isGrandfathered: false,
  adminOverridePlan: null,
  promoAccessUntil: null,
};

export function usePlanState(): PlanState {
  const { session } = useAuth();
  const [accessInfo, setAccessInfo] = useState<UserAccessInfo>(defaultAccessInfo);
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason | null>(null);

  // Fetch plan overrides from DB, auto-grandfather early users
  useEffect(() => {
    async function fetchPlanOverride() {
      if (!session?.user?.id) {
        setAccessInfo(defaultAccessInfo);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('plan_overrides')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching plan override:', error);
        }

        // Auto-grandfather: if user was created before launch date and not yet tracked
        const userCreatedAt = session.user.created_at;
        const shouldGrandfather = userCreatedAt && new Date(userCreatedAt) < new Date(PRICING_LAUNCH_DATE);

        if (data) {
          // If user qualifies but isn't grandfathered yet, update
          if (shouldGrandfather && !data.is_grandfathered) {
            await supabase
              .from('plan_overrides')
              .update({ is_grandfathered: true })
              .eq('user_id', session.user.id);
            data.is_grandfathered = true;
          }

          setAccessInfo({
            subscriptionPlan: (data.subscription_plan as PlanId) || 'free',
            isGrandfathered: data.is_grandfathered || false,
            adminOverridePlan: (data.admin_override_plan as PlanId) || null,
            promoAccessUntil: data.promo_access_until || null,
          });
        } else if (shouldGrandfather) {
          // No row yet — create one with grandfathered = true
          await supabase
            .from('plan_overrides')
            .insert({ user_id: session.user.id, is_grandfathered: true, subscription_plan: 'free' });

          setAccessInfo({ ...defaultAccessInfo, isGrandfathered: true });
        } else {
          setAccessInfo(defaultAccessInfo);
        }
      } catch (err) {
        console.error('Failed to load plan state:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlanOverride();
  }, [session?.user?.id]);

  const effectivePlan = getEffectivePlan(accessInfo);
  const accessBadge = getAccessBadge(accessInfo);

  const setCurrentPlan = useCallback((plan: PlanId) => {
    setAccessInfo(prev => ({ ...prev, subscriptionPlan: plan }));
  }, []);

  const openPaywall = useCallback((reason: PaywallReason) => {
    // Don't show paywall to users with special access
    if (hasSpecialAccess(accessInfo)) return;

    const config = paywallConfigs[reason];
    track('paywall_shown', { reason, recommendedPlan: config.recommendedPlan });
    setPaywallReason(reason);
    setPaywallOpen(true);
  }, [accessInfo]);

  const closePaywall = useCallback(() => {
    if (paywallReason) {
      track('upgrade_dismissed', { reason: paywallReason });
    }
    setPaywallOpen(false);
    setPaywallReason(null);
  }, [paywallReason]);

  return {
    currentPlan: effectivePlan,
    subscriptionPlan: accessInfo.subscriptionPlan,
    accessInfo,
    accessBadge,
    usage: mockUsage,
    paywallOpen,
    paywallReason,
    loading,
    setCurrentPlan,
    openPaywall,
    closePaywall,
  };
}

// Context for global plan state
export const PlanContext = createContext<PlanState | null>(null);

export function usePlan(): PlanState {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
