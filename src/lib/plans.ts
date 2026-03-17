// Plan data model, feature gating, and paywall logic

export type PlanId = 'free' | 'pro' | 'elite';
export type BillingCycle = 'monthly' | 'yearly';

// Pricing launch date — users created before this are grandfathered
export const PRICING_LAUNCH_DATE = '2026-03-01';

// Stripe price & product IDs
export const STRIPE_PLAN_IDS = {
  pro: {
    monthly: { price_id: 'price_1TBe0sRmEndXycaGjFaOW8im', product_id: 'prod_U9xw8HkikJdDCE' },
    yearly: { price_id: 'price_1TBe1aRmEndXycaGfoa8Xdtp', product_id: 'prod_U9xxiVNpQ9FA09' },
  },
  elite: {
    monthly: { price_id: 'price_1TBe2FRmEndXycaGOWO18p6O', product_id: 'prod_U9xyJGOw7lBgaD' },
    yearly: { price_id: 'price_1TBe2XRmEndXycaG6TZW3emn', product_id: 'prod_U9xynfg4pfxwun' },
  },
} as const;

// Reverse lookup: product_id -> PlanId
export const PRODUCT_TO_PLAN: Record<string, PlanId> = {
  'prod_U9xw8HkikJdDCE': 'pro',
  'prod_U9xxiVNpQ9FA09': 'pro',
  'prod_U9xyJGOw7lBgaD': 'elite',
  'prod_U9xynfg4pfxwun': 'elite',
};

export interface PlanFeature {
  label: string;
  included: boolean;
  detail?: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge?: string;
  highlighted?: boolean;
  helperText?: string;
  cta: string;
  features: PlanFeature[];
  limits: {
    aiRecapsPerMonth: number;
    pregameTalksPerMonth: number;
    historyDays: number | null; // null = unlimited
    maxLevel: number | null; // null = unlimited
    maxGamesTotal: number | null; // null = unlimited
    seasonReports: boolean;
    exportPdf: boolean;
    parentDashboard: boolean;
    recruitingProfile: boolean;
    advancedAnalytics: boolean;
    voiceJournaling: boolean;
    aiDevPlan: boolean;
    shareableLink: boolean;
    reportCard: boolean;
  };
}

// --- User access model ---
export interface UserAccessInfo {
  subscriptionPlan: PlanId;
  isGrandfathered: boolean;
  adminOverridePlan: PlanId | null;
  promoAccessUntil: string | null; // ISO date
  // AAU promo fields
  promoEligible: boolean;
  promoType: string | null;
  promoLockedIn: boolean;
  promoStartDate: string | null;
  promoSource: string | null;
  subscriptionStatus?: string; // 'active' | 'trialing' | etc.
}

/**
 * Determines the effective plan for feature gating.
 * Priority: grandfathered > admin override > promo lock-in > subscription
 */
export function getEffectivePlan(user: UserAccessInfo): PlanId {
  if (user.isGrandfathered) return 'elite';
  if (user.adminOverridePlan) return user.adminOverridePlan;
  // AAU promo lock-in: Elite access while on active Pro subscription
  if (
    user.promoLockedIn &&
    user.promoType === 'AAU_MARCH_2026_ELITE_LOCK' &&
    (user.subscriptionPlan === 'pro') &&
    user.subscriptionStatus === 'active'
  ) {
    return 'elite';
  }
  return user.subscriptionPlan;
}

/** Returns true if the user has any kind of special access (shouldn't see paywalls) */
export function hasSpecialAccess(user: UserAccessInfo): boolean {
  if (user.isGrandfathered) return true;
  if (user.adminOverridePlan) return true;
  if (
    user.promoLockedIn &&
    user.promoType === 'AAU_MARCH_2026_ELITE_LOCK' &&
    (user.subscriptionPlan === 'pro') &&
    user.subscriptionStatus === 'active'
  ) return true;
  return false;
}

export type AccessBadge =
  | { type: 'grandfathered'; label: string }
  | { type: 'admin_override'; label: string; plan: PlanId }
  | { type: 'promo_locked'; label: string }
  | null;

export function getAccessBadge(user: UserAccessInfo): AccessBadge {
  if (user.isGrandfathered) return { type: 'grandfathered', label: 'Founding Member' };
  if (user.adminOverridePlan) return { type: 'admin_override', label: `${planCatalog[user.adminOverridePlan].name} Access (Admin Granted)`, plan: user.adminOverridePlan };
  if (
    user.promoLockedIn &&
    user.promoType === 'AAU_MARCH_2026_ELITE_LOCK' &&
    (user.subscriptionPlan === 'pro') &&
    user.subscriptionStatus === 'active'
  ) {
    return { type: 'promo_locked', label: 'AAU Founding Member — Elite Access Locked In' };
  }
  return null;
}

export const planCatalog: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Start your Hoop Journal and begin tracking your game.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: 'Start Free',
    features: [
      { label: 'Create player profile', included: true },
      { label: 'Log games', included: true },
      { label: 'Basic stat tracking', included: true },
      { label: 'XP progression', included: true },
      { label: 'Limited report card generation', included: true },
      { label: 'Limited AI Coach prompts', included: true },
      { label: 'Advanced analytics', included: false },
      { label: 'Full report cards & sharing', included: false },
    ],
    limits: {
      aiRecapsPerMonth: 2,
      pregameTalksPerMonth: 0,
      historyDays: 30,
      maxLevel: 10,
      maxGamesTotal: 3,
      seasonReports: false,
      exportPdf: false,
      parentDashboard: false,
      recruitingProfile: false,
      advancedAnalytics: false,
      voiceJournaling: false,
      aiDevPlan: false,
      shareableLink: false,
      reportCard: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Unlock your full game with advanced tracking and performance insights.',
    monthlyPrice: 7.99,
    yearlyPrice: 79.99,
    badge: 'Most Popular',
    highlighted: true,
    cta: 'Go Pro',
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Unlimited game logs', included: true },
      { label: 'Full report card generation', included: true },
      { label: 'Performance trends & analytics', included: true },
      { label: 'Career stats tracking', included: true },
      { label: 'XP progression & leveling system', included: true },
      { label: 'Exportable report cards & share graphics', included: true },
      { label: 'Full AI Coach insights', included: true },
      { label: 'Season analytics dashboard', included: true },
    ],
    limits: {
      aiRecapsPerMonth: Infinity,
      pregameTalksPerMonth: Infinity,
      historyDays: null,
      maxLevel: null,
      maxGamesTotal: null,
      seasonReports: true,
      exportPdf: true,
      parentDashboard: false,
      recruitingProfile: false,
      advancedAnalytics: true,
      voiceJournaling: true,
      aiDevPlan: false,
      shareableLink: true,
      reportCard: true,
    },
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    tagline: 'Train like an elite player with advanced insights and development tools.',
    monthlyPrice: 17.99,
    yearlyPrice: 179.99,
    badge: 'Best for AAU & Varsity',
    helperText: 'Best for AAU and varsity players.',
    cta: 'Go Elite',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Advanced AI Coach breakdowns', included: true },
      { label: 'Player development insights', included: true },
      { label: 'Shot charts', included: true },
      { label: 'Skill progress tracking', included: true },
      { label: 'Performance comparisons', included: true },
      { label: 'Early access to new features', included: true },
      { label: 'Elite badge on player profile', included: true },
    ],
    limits: {
      aiRecapsPerMonth: Infinity,
      pregameTalksPerMonth: Infinity,
      historyDays: null,
      maxLevel: null,
      maxGamesTotal: null,
      seasonReports: true,
      exportPdf: true,
      parentDashboard: true,
      recruitingProfile: true,
      advancedAnalytics: true,
      voiceJournaling: true,
      aiDevPlan: true,
      shareableLink: true,
      reportCard: true,
    },
  },
};

export const planOrder: PlanId[] = ['free', 'pro', 'elite'];

const planRank: Record<PlanId, number> = { free: 0, pro: 1, elite: 2 };

export function canUseFeature(currentPlan: PlanId, featureKey: keyof Plan['limits']): boolean {
  const limits = planCatalog[currentPlan].limits;
  const val = limits[featureKey];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  return val === null; // null means unlimited
}

export function requirePlan(currentPlan: PlanId, minPlan: PlanId): boolean {
  return planRank[currentPlan] >= planRank[minPlan];
}

export function getPlanPrice(planId: PlanId, cycle: BillingCycle): number {
  const plan = planCatalog[planId];
  return cycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
}

export function getYearlySavingsPercent(planId: PlanId): number {
  const plan = planCatalog[planId];
  if (plan.monthlyPrice === 0) return 0;
  const yearlyMonthly = plan.yearlyPrice / 12;
  return Math.round((1 - yearlyMonthly / plan.monthlyPrice) * 100);
}

// Paywall reason types
export type PaywallReason =
  | 'ai_recap_limit'
  | 'history_limit'
  | 'level_cap'
  | 'season_report'
  | 'advanced_analytics'
  | 'export_pdf'
  | 'parent_dashboard'
  | 'recruiting_profile'
  | 'report_card';

export interface PaywallConfig {
  title: string;
  description: string;
  recommendedPlan: PlanId;
  mode: 'modal' | 'fullscreen';
}

export const paywallConfigs: Record<PaywallReason, PaywallConfig> = {
  ai_recap_limit: {
    title: 'Unlock full AI Coach.',
    description: "You've used all your AI prompts this month. Upgrade to Pro for unlimited insights from every game.",
    recommendedPlan: 'pro',
    mode: 'modal',
  },
  history_limit: {
    title: 'See your full journey.',
    description: "Your Free plan shows the last 30 days. Upgrade to Pro to view your entire game history and track long-term growth.",
    recommendedPlan: 'pro',
    mode: 'modal',
  },
  level_cap: {
    title: "You've outgrown Free.",
    description: "You've hit Level 10 — the max on Free. Upgrade to Pro to keep leveling up and unlock new rewards.",
    recommendedPlan: 'pro',
    mode: 'modal',
  },
  season_report: {
    title: 'Unlock Season Reports.',
    description: "Generate detailed season reports to track your progress over time and share with coaches.",
    recommendedPlan: 'pro',
    mode: 'fullscreen',
  },
  advanced_analytics: {
    title: 'Unlock full performance insights with Pro.',
    description: "Dive deeper into your stats with trends, splits, and AI-powered insights.",
    recommendedPlan: 'pro',
    mode: 'fullscreen',
  },
  export_pdf: {
    title: 'Export Your Season.',
    description: "Download a professional PDF report of your season — perfect for recruiting and college applications.",
    recommendedPlan: 'pro',
    mode: 'fullscreen',
  },
  parent_dashboard: {
    title: 'Parent Dashboard.',
    description: "Give parents a dedicated view to follow your basketball journey and development.",
    recommendedPlan: 'elite',
    mode: 'fullscreen',
  },
  recruiting_profile: {
    title: 'Recruiting Profile.',
    description: "Create a shareable, college-ready profile page with your stats, highlights, and player narrative.",
    recommendedPlan: 'elite',
    mode: 'fullscreen',
  },
  report_card: {
    title: 'Share Game Report Cards.',
    description: "Create stunning, shareable game report cards for Instagram and more. Upgrade to Pro to unlock.",
    recommendedPlan: 'pro',
    mode: 'modal',
  },
};

// Mock usage data
export interface UsageData {
  aiRecapsUsed: number;
  pregameTalksUsed: number;
  seasonReportsGenerated: number;
}

export const mockUsage: UsageData = {
  aiRecapsUsed: 1,
  pregameTalksUsed: 0,
  seasonReportsGenerated: 0,
};

// Mock event tracking
export function track(event: string, data?: Record<string, unknown>) {
  console.log(`[Analytics] ${event}`, data);
}

// Compare table features
export interface CompareFeature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  elite: string | boolean;
}

export const compareFeatures: CompareFeature[] = [
  { label: 'Player profile', free: true, pro: true, elite: true },
  { label: 'Game logging', free: '30 days', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'Basic stat tracking', free: true, pro: true, elite: true },
  { label: 'XP & Leveling', free: 'Cap at Lv 10', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'AI Coach prompts', free: '2/month', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'Report card generation', free: 'Limited', pro: 'Full', elite: 'Full' },
  { label: 'Report card sharing', free: false, pro: true, elite: true },
  { label: 'Performance trends & analytics', free: false, pro: true, elite: true },
  { label: 'Career stats', free: false, pro: true, elite: true },
  { label: 'Season analytics dashboard', free: false, pro: true, elite: true },
  { label: 'Exportable report cards', free: false, pro: true, elite: true },
  { label: 'Advanced AI Coach breakdowns', free: false, pro: false, elite: true },
  { label: 'Player development insights', free: false, pro: false, elite: true },
  { label: 'Shot charts', free: false, pro: false, elite: true },
  { label: 'Performance comparisons', free: false, pro: false, elite: true },
  { label: 'Early access to new features', free: false, pro: false, elite: true },
  { label: 'Elite badge', free: false, pro: false, elite: true },
];

// FAQ data
export const faqItems = [
  {
    question: 'Will Free always be free?',
    answer: "Yes! The Free plan is here to stay. You'll always be able to log games, track XP, and use basic stats at no cost. We believe every player deserves a place to track their journey.",
  },
  {
    question: 'Can I switch plans?',
    answer: "Absolutely. You can upgrade, downgrade, or switch between monthly and yearly billing anytime. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: 'What happens to my data if I downgrade?',
    answer: "Your data stays yours — always. If you downgrade, you'll keep everything you've logged. Some features may become limited (like AI insights), but your game history and stats are never deleted.",
  },
  {
    question: 'What makes Elite different from Pro?',
    answer: "Elite is built for serious players — AAU and varsity level. You get advanced AI Coach breakdowns, player development insights, shot charts, performance comparisons, and early access to new features. Plus an Elite badge on your profile.",
  },
];
