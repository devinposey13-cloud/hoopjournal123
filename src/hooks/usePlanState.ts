import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import {
  PlanId, PaywallReason, paywallConfigs, mockUsage, UsageData, track,
  UserAccessInfo, getEffectivePlan, hasSpecialAccess, getAccessBadge, AccessBadge,
  PRICING_LAUNCH_DATE, planCatalog,
} from '@/lib/plans';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface PlanState {
  currentPlan: PlanId; // effective plan (computed)
  subscriptionPlan: PlanId; // raw subscription
  accessInfo: UserAccessInfo;
  accessBadge: AccessBadge;
  usage: UsageData;
  lifetimeGamesLogged: number;
  lifetimeReportCards: number;
  lifetimePdfExports: number;
  paywallOpen: boolean;
  paywallReason: PaywallReason | null;
  loading: boolean;
  setCurrentPlan: (plan: PlanId) => void;
  openPaywall: (reason: PaywallReason) => void;
  closePaywall: () => void;
  canLogGame: () => boolean;
  canGenerateReportCard: () => boolean;
  canExportPdf: () => boolean;
  incrementReportCards: () => void;
  incrementPdfExports: () => void;
  freeGamesRemaining: number;
  freeReportCardsRemaining: number;
  freePdfExportsRemaining: number;
}

const defaultAccessInfo: UserAccessInfo = {
  subscriptionPlan: 'free',
  isGrandfathered: false,
  adminOverridePlan: null,
  promoAccessUntil: null,
  promoEligible: false,
  promoType: null,
  promoLockedIn: false,
  promoStartDate: null,
  promoSource: null,
};

export function usePlanState(): PlanState {
  const { session } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const [accessInfo, setAccessInfo] = useState<UserAccessInfo>(defaultAccessInfo);
  const [lifetimeGamesLogged, setLifetimeGamesLogged] = useState(0);
  const [lifetimeReportCards, setLifetimeReportCards] = useState(0);
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

          const rawPlan = (data.subscription_plan as string) || 'free';
          // Map legacy 'starter' plan to 'pro'
          const mappedPlan: PlanId = rawPlan === 'starter' ? 'pro' : (rawPlan as PlanId);
          setAccessInfo({
            subscriptionPlan: mappedPlan,
            isGrandfathered: data.is_grandfathered || false,
            adminOverridePlan: (data.admin_override_plan as PlanId) || null,
            promoAccessUntil: data.promo_access_until || null,
            promoEligible: data.promo_eligible || false,
            promoType: data.promo_type || null,
            promoLockedIn: data.promo_locked_in || false,
            promoStartDate: data.promo_start_date || null,
            promoSource: data.promo_source || null,
            subscriptionStatus: subscriptionStatus || undefined,
          });
          setLifetimeGamesLogged(data.lifetime_games_logged ?? 0);
          setLifetimeReportCards(data.lifetime_report_cards_generated ?? 0);
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
  }, [session?.user?.id, subscriptionStatus]);

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
    // Track free limit hit for conversion analytics
    if (reason === 'game_limit' || reason === 'report_card_limit') {
      track('free_limit_hit', { limitType: reason });
    }
    track('upgrade_modal_opened', { reason });
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

  const canLogGame = useCallback(() => {
    const limits = planCatalog[effectivePlan].limits;
    if (limits.maxGamesTotal === null) return true;
    return lifetimeGamesLogged < limits.maxGamesTotal;
  }, [effectivePlan, lifetimeGamesLogged]);

  const canGenerateReportCard = useCallback(() => {
    const limits = planCatalog[effectivePlan].limits;
    if (limits.maxReportCards === null) return true;
    return lifetimeReportCards < limits.maxReportCards;
  }, [effectivePlan, lifetimeReportCards]);

  const incrementReportCards = useCallback(async () => {
    setLifetimeReportCards(prev => prev + 1);
    if (session?.user?.id) {
      await supabase
        .from('plan_overrides')
        .upsert({
          user_id: session.user.id,
          lifetime_report_cards_generated: lifetimeReportCards + 1,
        }, { onConflict: 'user_id' });
    }
  }, [session?.user?.id, lifetimeReportCards]);

  // Compute remaining counts
  const maxGames = planCatalog[effectivePlan].limits.maxGamesTotal;
  const maxReports = planCatalog[effectivePlan].limits.maxReportCards;
  const freeGamesRemaining = maxGames !== null ? Math.max(0, maxGames - lifetimeGamesLogged) : Infinity;
  const freeReportCardsRemaining = maxReports !== null ? Math.max(0, maxReports - lifetimeReportCards) : Infinity;

  return {
    currentPlan: effectivePlan,
    subscriptionPlan: accessInfo.subscriptionPlan,
    accessInfo,
    accessBadge,
    usage: mockUsage,
    lifetimeGamesLogged,
    lifetimeReportCards,
    paywallOpen,
    paywallReason,
    loading,
    setCurrentPlan,
    openPaywall,
    closePaywall,
    canLogGame,
    canGenerateReportCard,
    incrementReportCards,
    freeGamesRemaining,
    freeReportCardsRemaining,
  };
}

// Context for global plan state
export const PlanContext = createContext<PlanState | null>(null);

export function usePlan(): PlanState {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
