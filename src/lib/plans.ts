// Plan data model, feature gating, and paywall logic

export type PlanId = 'free' | 'starter' | 'pro' | 'elite';
export type BillingCycle = 'monthly' | 'yearly';

// Pricing launch date — users created before this are grandfathered
export const PRICING_LAUNCH_DATE = '2026-03-01';

// Stripe price & product IDs
export const STRIPE_PLAN_IDS = {
  starter: {
    monthly: { price_id: 'price_1T4OgtRmEndXycaGheeNenUl', product_id: 'prod_U2TenmJYJtafl8' },
    yearly: { price_id: 'price_1T4Oh8RmEndXycaGDCWstZbx', product_id: 'prod_U2Te369rDpYwBQ' },
  },
  pro: {
    monthly: { price_id: 'price_1T4OhTRmEndXycaGihIBzJ4z', product_id: 'prod_U2TeAY16X7k2Ri' },
    yearly: { price_id: 'price_1T4OhiRmEndXycaGTCZ1brsJ', product_id: 'prod_U2TfBflXbqKewl' },
  },
  elite: {
    monthly: { price_id: 'price_1T4Oi0RmEndXycaGTr3xvLEP', product_id: 'prod_U2TfBcoxhUepHK' },
    yearly: { price_id: 'price_1T4OiMRmEndXycaGvwSVdgYK', product_id: 'prod_U2Tfh9dNymbaRg' },
  },
} as const;

// Reverse lookup: product_id -> PlanId
export const PRODUCT_TO_PLAN: Record<string, PlanId> = {
  'prod_U2TenmJYJtafl8': 'starter',
  'prod_U2Te369rDpYwBQ': 'starter',
  'prod_U2TeAY16X7k2Ri': 'pro',
  'prod_U2TfBflXbqKewl': 'pro',
  'prod_U2TfBcoxhUepHK': 'elite',
  'prod_U2Tfh9dNymbaRg': 'elite',
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
  cta: string;
  features: PlanFeature[];
  limits: {
    aiRecapsPerMonth: number;
    pregameTalksPerMonth: number;
    historyDays: number | null; // null = unlimited
    maxLevel: number | null; // null = unlimited
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
  // AAU promo lock-in: Elite access while on active Starter subscription
  if (
    user.promoLockedIn &&
    user.promoType === 'AAU_MARCH_2026_ELITE_LOCK' &&
    user.subscriptionPlan === 'starter' &&
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
    user.subscriptionPlan === 'starter' &&
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
    user.subscriptionPlan === 'starter' &&
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
    tagline: 'Start your journey.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: 'Start Free',
    features: [
      { label: 'Game logging (last 30 days)', included: true },
      { label: 'Basic XP & Leveling (cap at Lv 10)', included: true },
      { label: '2 AI Recaps per month', included: true },
      { label: 'Basic dashboard stats', included: true },
      { label: 'Unlimited history', included: false },
      { label: 'Advanced analytics', included: false },
      { label: 'Recruiting profile', included: false },
    ],
    limits: {
      aiRecapsPerMonth: 2,
      pregameTalksPerMonth: 0,
      historyDays: 30,
      maxLevel: 10,
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
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'Build habits. Track progress.',
    monthlyPrice: 8,
    yearlyPrice: 79,
    badge: 'Best for casual + consistent',
    cta: 'Go Starter',
    features: [
      { label: 'Unlimited history', included: true },
      { label: 'Full XP leveling (no cap)', included: true },
      { label: '4 AI Recaps per month', included: true },
      { label: '1 Pregame Talk per week', included: true },
      { label: 'Goals & streaks', included: true },
      { label: 'Voice journaling (basic)', included: true },
      { label: 'Advanced analytics', included: false },
    ],
    limits: {
      aiRecapsPerMonth: 4,
      pregameTalksPerMonth: 4,
      historyDays: null,
      maxLevel: null,
      seasonReports: false,
      exportPdf: false,
      parentDashboard: false,
      recruitingProfile: false,
      advancedAnalytics: false,
      voiceJournaling: true,
      aiDevPlan: false,
      shareableLink: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Train smarter. Improve faster.',
    monthlyPrice: 19,
    yearlyPrice: 179,
    badge: 'Most Popular',
    highlighted: true,
    cta: 'Go Pro',
    features: [
      { label: 'Unlimited AI recaps & pregame talks', included: true },
      { label: 'Advanced analytics & trends', included: true },
      { label: 'Quarterly Season XP resets', included: true },
      { label: 'AI development plan (monthly)', included: true },
      { label: 'Shareable player summary link', included: true },
      { label: 'Season awards', included: true },
      { label: 'Recruiting profile', included: false },
    ],
    limits: {
      aiRecapsPerMonth: Infinity,
      pregameTalksPerMonth: Infinity,
      historyDays: null,
      maxLevel: null,
      seasonReports: true,
      exportPdf: false,
      parentDashboard: false,
      recruitingProfile: false,
      advancedAnalytics: true,
      voiceJournaling: true,
      aiDevPlan: true,
      shareableLink: true,
    },
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    tagline: 'Recruiting-ready. Next level.',
    monthlyPrice: 49,
    yearlyPrice: 449,
    badge: 'Recruiting / exposure',
    cta: 'Go Elite',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Recruiting profile page + link', included: true },
      { label: 'Exportable PDF season report', included: true },
      { label: 'Parent dashboard view', included: true },
      { label: '"College-ready" player narrative', included: true },
      { label: 'Priority support', included: true },
    ],
    limits: {
      aiRecapsPerMonth: Infinity,
      pregameTalksPerMonth: Infinity,
      historyDays: null,
      maxLevel: null,
      seasonReports: true,
      exportPdf: true,
      parentDashboard: true,
      recruitingProfile: true,
      advancedAnalytics: true,
      voiceJournaling: true,
      aiDevPlan: true,
      shareableLink: true,
    },
  },
};

export const planOrder: PlanId[] = ['free', 'starter', 'pro', 'elite'];

const planRank: Record<PlanId, number> = { free: 0, starter: 1, pro: 2, elite: 3 };

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
  | 'recruiting_profile';

export interface PaywallConfig {
  title: string;
  description: string;
  recommendedPlan: PlanId;
  mode: 'modal' | 'fullscreen';
}

export const paywallConfigs: Record<PaywallReason, PaywallConfig> = {
  ai_recap_limit: {
    title: 'Unlock more Coach AI.',
    description: "You've used all your AI recaps this month. Upgrade to get more insights from every game.",
    recommendedPlan: 'starter',
    mode: 'modal',
  },
  history_limit: {
    title: 'See your full journey.',
    description: "Your Free plan shows the last 30 days. Upgrade to view your entire game history and track long-term growth.",
    recommendedPlan: 'starter',
    mode: 'modal',
  },
  level_cap: {
    title: "You've outgrown Free.",
    description: "You've hit Level 10 — the max on Free. Upgrade to keep leveling up and unlock new rewards.",
    recommendedPlan: 'starter',
    mode: 'modal',
  },
  season_report: {
    title: 'Unlock Season Reports.',
    description: "Generate detailed season reports to track your progress over time and share with coaches.",
    recommendedPlan: 'pro',
    mode: 'fullscreen',
  },
  advanced_analytics: {
    title: 'Advanced Analytics.',
    description: "Dive deeper into your stats with trends, splits, and AI-powered insights.",
    recommendedPlan: 'pro',
    mode: 'fullscreen',
  },
  export_pdf: {
    title: 'Export Your Season.',
    description: "Download a professional PDF report of your season — perfect for recruiting and college applications.",
    recommendedPlan: 'elite',
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
  starter: string | boolean;
  pro: string | boolean;
  elite: string | boolean;
}

export const compareFeatures: CompareFeature[] = [
  { label: 'Game logging', free: '30 days', starter: 'Unlimited', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'XP & Leveling', free: 'Cap at Lv 10', starter: 'Unlimited', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'AI Recaps', free: '2/month', starter: '4/month', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'Pregame Talks', free: false, starter: '1/week', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'Goals & Streaks', free: false, starter: true, pro: true, elite: true },
  { label: 'Voice Journaling', free: false, starter: 'Basic', pro: true, elite: true },
  { label: 'Advanced Analytics', free: false, starter: false, pro: true, elite: true },
  { label: 'Season XP Resets', free: false, starter: false, pro: true, elite: true },
  { label: 'AI Dev Plan', free: false, starter: false, pro: 'Monthly', elite: 'Monthly' },
  { label: 'Shareable Link', free: false, starter: false, pro: true, elite: true },
  { label: 'Season Reports', free: false, starter: false, pro: true, elite: true },
  { label: 'Export PDF', free: false, starter: false, pro: false, elite: true },
  { label: 'Recruiting Profile', free: false, starter: false, pro: false, elite: true },
  { label: 'Parent Dashboard', free: false, starter: false, pro: false, elite: true },
  { label: 'Player Narrative', free: false, starter: false, pro: false, elite: true },
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
    answer: "Your data stays yours — always. If you downgrade, you'll keep everything you've logged. Some features may become limited (like AI recaps), but your game history and stats are never deleted.",
  },
  {
    question: 'Does Elite help with recruiting?',
    answer: "Yes! Elite includes a recruiting profile page with a shareable link, a \"college-ready\" player narrative summary, and exportable PDF reports. It's designed to give coaches everything they need at a glance.",
  },
];
