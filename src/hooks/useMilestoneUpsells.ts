import { useState, useCallback } from 'react';
import { type PlanId, track, type UserAccessInfo, hasSpecialAccess } from '@/lib/plans';
import { type UpgradeDrawerConfig } from '@/components/upgrade/UpgradeDrawer';

// Milestone types that trigger upsells
export type UpsellMilestone =
  | 'games_logged_3'
  | 'ai_recap_limit'
  | 'level_cap'
  | 'analytics_tab'
  | 'recruiting_mode';

const milestoneConfigs: Record<UpsellMilestone, UpgradeDrawerConfig> = {
  games_logged_3: {
    title: 'Want better insights?',
    description: "You've logged 3 games — unlock more from every session.",
    recommendedPlan: 'starter',
    milestone: 'games_logged_3',
    benefits: [
      'Unlimited game history',
      'Weekly AI recap',
      'Goals & streaks tracking',
      'Voice journaling',
    ],
  },
  ai_recap_limit: {
    title: 'Unlock more Coach AI.',
    description: "You've used your 2 free AI recaps this month.",
    recommendedPlan: 'starter',
    milestone: 'ai_recap_limit',
    benefits: [
      '4 AI recaps per month',
      '1 Pregame Talk per week',
      'Unlimited game history',
      'Full XP leveling',
    ],
  },
  level_cap: {
    title: "You've outgrown Free.",
    description: "You hit Level 10 — the max on Free. Keep leveling up.",
    recommendedPlan: 'starter',
    milestone: 'level_cap',
    benefits: [
      'Full leveling (no cap)',
      'Unlimited journey view',
      'Weekly AI recap',
      'Goals & streaks',
    ],
  },
  analytics_tab: {
    title: 'Train smarter. Improve faster.',
    description: 'Unlock advanced analytics and trends to level up your game.',
    recommendedPlan: 'pro',
    milestone: 'analytics_tab',
    benefits: [
      'Advanced analytics & trends',
      'Unlimited AI recaps & pregame talks',
      'Monthly AI development plan',
      'Shareable player summary',
    ],
  },
  recruiting_mode: {
    title: 'Recruiting-ready. Next level.',
    description: 'Create a college-ready profile that coaches can see.',
    recommendedPlan: 'elite',
    milestone: 'recruiting_mode',
    benefits: [
      'Recruiting profile + shareable link',
      'Exportable PDF season report',
      'Parent dashboard view',
      '"College-ready" player narrative',
    ],
  },
};

interface UseMilestoneUpsellsReturn {
  drawerOpen: boolean;
  drawerConfig: UpgradeDrawerConfig | null;
  triggerMilestone: (milestone: UpsellMilestone) => void;
  closeDrawer: () => void;
  /** For analytics tab: check user profile to decide between Starter/Pro */
  triggerAnalytics: (gamesLogged: number, skillLevel?: string) => void;
}

export function useMilestoneUpsells(accessInfo?: UserAccessInfo): UseMilestoneUpsellsReturn {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerConfig, setDrawerConfig] = useState<UpgradeDrawerConfig | null>(null);

  const triggerMilestone = useCallback((milestone: UpsellMilestone) => {
    // Don't show upsells to grandfathered/override/promo users
    if (accessInfo && hasSpecialAccess(accessInfo)) return;

    const config = milestoneConfigs[milestone];
    track('upgrade_drawer_shown', { milestone });
    setDrawerConfig(config);
    setDrawerOpen(true);
  }, [accessInfo]);

  const triggerAnalytics = useCallback((gamesLogged: number, skillLevel?: string) => {
    if (accessInfo && hasSpecialAccess(accessInfo)) return;

    const shouldRecommendPro =
      gamesLogged >= 5 || skillLevel === 'competitive' || skillLevel === 'elite';

    const config = shouldRecommendPro
      ? milestoneConfigs.analytics_tab
      : {
          ...milestoneConfigs.analytics_tab,
          recommendedPlan: 'starter' as PlanId,
          title: 'Want better insights?',
          description: 'See trends and deeper stats as you log more games.',
          benefits: [
            'Unlimited game history',
            'Full XP leveling',
            'Weekly AI recap',
            'Goals & streaks',
          ],
        };

    track('upgrade_drawer_shown', { milestone: 'analytics_tab' });
    setDrawerConfig(config);
    setDrawerOpen(true);
  }, [accessInfo]);

  const closeDrawer = useCallback(() => {
    if (drawerConfig) {
      track('upgrade_dismissed', { reason: drawerConfig.milestone });
    }
    setDrawerOpen(false);
    setDrawerConfig(null);
  }, [drawerConfig]);

  return {
    drawerOpen,
    drawerConfig,
    triggerMilestone,
    closeDrawer,
    triggerAnalytics,
  };
}
