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
    title: 'Unlock your full game.',
    description: "You've logged 3 games — upgrade to Pro for full performance insights.",
    recommendedPlan: 'pro',
    milestone: 'games_logged_3',
    benefits: [
      'Unlimited game logs',
      'Full AI Coach insights',
      'Performance trends & analytics',
      'Exportable report cards',
    ],
  },
  ai_recap_limit: {
    title: 'Unlock full AI Coach.',
    description: "You've used your free AI prompts this month.",
    recommendedPlan: 'pro',
    milestone: 'ai_recap_limit',
    benefits: [
      'Unlimited AI Coach insights',
      'Performance trends & analytics',
      'Unlimited game logs',
      'Full XP leveling',
    ],
  },
  level_cap: {
    title: "You've outgrown Free.",
    description: "You hit Level 10 — the max on Free. Keep leveling up with Pro.",
    recommendedPlan: 'pro',
    milestone: 'level_cap',
    benefits: [
      'Full leveling (no cap)',
      'Unlimited game history',
      'Full AI Coach insights',
      'Career stats tracking',
    ],
  },
  analytics_tab: {
    title: 'Unlock full performance insights with Pro.',
    description: 'Unlock advanced analytics and trends to level up your game.',
    recommendedPlan: 'pro',
    milestone: 'analytics_tab',
    benefits: [
      'Performance trends & analytics',
      'Unlimited AI Coach insights',
      'Season analytics dashboard',
      'Exportable report cards',
    ],
  },
  recruiting_mode: {
    title: 'Train like an elite player.',
    description: 'Unlock advanced development tools and player insights.',
    recommendedPlan: 'elite',
    milestone: 'recruiting_mode',
    benefits: [
      'Advanced AI Coach breakdowns',
      'Player development insights',
      'Shot charts & skill tracking',
      'Performance comparisons',
    ],
  },
};

interface UseMilestoneUpsellsReturn {
  drawerOpen: boolean;
  drawerConfig: UpgradeDrawerConfig | null;
  triggerMilestone: (milestone: UpsellMilestone) => void;
  closeDrawer: () => void;
  /** For analytics tab: check user profile to decide between Pro/Elite */
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

    const shouldRecommendElite =
      gamesLogged >= 10 || skillLevel === 'competitive' || skillLevel === 'elite';

    const config = shouldRecommendElite
      ? milestoneConfigs.recruiting_mode
      : milestoneConfigs.analytics_tab;

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
