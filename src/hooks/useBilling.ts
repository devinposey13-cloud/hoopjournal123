/**
 * Unified billing hook — Despia + RevenueCat for native, Stripe for web.
 *
 * This replaces the old useRevenueCat hook entirely.
 * Backend (plan_overrides table) is the source of truth for access.
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { isDespia, isDespiaIOS, isDespiaAndroid, isWeb, getPlatform } from '@/lib/platform';
import { type PlanId, type BillingCycle } from '@/lib/plans';
import { toast } from 'sonner';

// ─── Product ID mapping ───────────────────────────────────────────────
// Store product IDs → internal plan
export const PRODUCT_TO_PLAN: Record<string, PlanId> = {
  // Current HoopJ product IDs
  HoopJ_pro_monthly: 'pro',
  HoopJ_pro_yearly: 'pro',
  HoopJ_elite_monthly: 'elite',
  HoopJ_elite_yearly: 'elite',
  // hj_ product IDs (starter maps to pro entitlement)
  hj_starter_monthly: 'pro',
  hj_starter_yearly: 'pro',
  hj_pro_monthly: 'pro',
  hj_pro_yearly: 'pro',
  hj_elite_monthly: 'elite',
  hj_elite_yearly: 'elite',
  // Generic IDs
  monthly: 'pro',
  yearly: 'pro',
  lifetime: 'elite',
  // Android prefixed variants
  'premium:HoopJ_pro_monthly': 'pro',
  'premium:HoopJ_pro_yearly': 'pro',
  'premium:HoopJ_elite_monthly': 'elite',
  'premium:HoopJ_elite_yearly': 'elite',
  'premium:hj_pro_monthly': 'pro',
  'premium:hj_pro_yearly': 'pro',
  'premium:hj_elite_monthly': 'elite',
  'premium:hj_elite_yearly': 'elite',
};

// Internal plan + billing → store product ID
function getNativeProductId(planId: PlanId, billingCycle: BillingCycle): string {
  const base = `HoopJ_${planId}_${billingCycle === 'yearly' ? 'yearly' : 'monthly'}`;
  if (isDespiaAndroid()) return `premium:${base}`;
  return base;
}

// ─── User-facing error messages ─────────────────────────────────────
const USER_ERRORS: Record<string, string> = {
  product_not_found: "This plan isn't available right now. Please try again in a moment.",
  network: 'No internet connection. Please reconnect and try again.',
  payment_failed: "We couldn't complete the purchase right now. Please try again.",
  unknown: "Something went wrong. Please try again in a moment.",
};

/** Check if an error indicates user cancellation */
function isUserCancellation(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('user cancelled') ||
    msg.includes('skcancel') ||
    msg.includes('purchasecancellederror') ||
    msg.includes('usercancelledpurchase') ||
    msg.includes('billing_response_result_user_canceled')
  );
}

/** Map raw error to user-friendly message */
function getUserErrorMessage(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('product') && (msg.includes('not found') || msg.includes('missing'))) {
    return USER_ERRORS.product_not_found;
  }
  if (msg.includes('network') || msg.includes('offline') || msg.includes('internet')) {
    return USER_ERRORS.network;
  }
  if (msg.includes('payment') || msg.includes('billing') || msg.includes('declined')) {
    return USER_ERRORS.payment_failed;
  }
  return USER_ERRORS.unknown;
}

// ─── Diagnostics ──────────────────────────────────────────────────────
export interface BillingDiagnostics {
  isDespia: boolean;
  isDespiaIOS: boolean;
  isDespiaAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

function getDiagnostics(): BillingDiagnostics {
  return {
    isDespia: isDespia(),
    isDespiaIOS: isDespiaIOS(),
    isDespiaAndroid: isDespiaAndroid(),
    isWeb: isWeb(),
    platform: getPlatform(),
  };
}

// ─── Restore data types ───────────────────────────────────────────────
export interface RestoredPurchase {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  type?: string;
  entitlementId?: string;
  isActive?: boolean;
  willRenew?: boolean;
  purchaseDate?: string;
  originalPurchaseDate?: string;
  expirationDate?: string;
  store?: string;
  country?: string;
  environment?: string;
  receipt?: string;
}

// ─── Hook return ──────────────────────────────────────────────────────
export interface UseBillingReturn {
  /** Purchase a plan. Routes to Despia/RC on native, Stripe on web. Returns whether purchase was confirmed. */
  purchasePlan: (planId: PlanId, billingCycle: BillingCycle) => Promise<{ confirmed: boolean }>;
  /** Launch RevenueCat native paywall (Despia launchPaywall). */
  launchNativePaywall: (offering?: string) => Promise<void>;
  /** Restore purchases (native only). */
  restorePurchases: () => Promise<RestoredPurchase[]>;
  /** Refresh subscription status from backend. */
  refreshSubscriptionStatus: () => Promise<void>;
  /** Current billing environment info. */
  diagnostics: BillingDiagnostics;
  /** Debug log entries. */
  debugLog: string[];
  /** Whether a purchase is in progress. */
  isPurchasing: boolean;
  /** Whether a restore is in progress. */
  isRestoring: boolean;
  /** Whether we're on a native platform. */
  isNative: boolean;
  /** The last purchase result status */
  lastPurchaseResult: 'idle' | 'success' | 'cancelled' | 'error';
}

export function useBilling(): UseBillingReturn {
  const { user } = useAuth();
  const { createCheckout, checkSubscription } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastPurchaseResult, setLastPurchaseResult] = useState<'idle' | 'success' | 'cancelled' | 'error'>('idle');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const despiaRef = useRef<any>(null);
  const purchaseInFlightRef = useRef(false);

  const log = useCallback((msg: string) => {
    const entry = `${new Date().toISOString().slice(11, 19)} ${msg}`;
    console.log(msg);
    setDebugLog((prev) => [...prev, entry]);
  }, []);

  // Lazy-load despia-native
  const getDespia = useCallback(async () => {
    if (despiaRef.current) return despiaRef.current;
    try {
      const mod = await import('despia-native');
      despiaRef.current = mod.default || mod;
      return despiaRef.current;
    } catch (err) {
      log(`[Billing] ❌ Failed to import despia-native: ${err}`);
      throw new Error('Despia SDK not available');
    }
  }, [log]);

  // Poll backend for subscription update — returns the confirmed plan or null
  const pollSubscriptionStatus = useCallback(async (maxAttempts: number, delayMs: number, expectedPlan?: PlanId): Promise<PlanId | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      log(`[Billing] Polling backend (${i + 1}/${maxAttempts})…`);
      try {
        const { data } = await supabase.functions.invoke('check-subscription');
        const rawPlan = (data?.plan_type as string) || null;
        const plan = rawPlan === 'starter' ? 'pro' : rawPlan;
        log(`[Billing] Backend plan: ${plan}, expected: ${expectedPlan || 'any'}`);
        if (expectedPlan && plan === expectedPlan) {
          log(`[Billing] ✓ Backend confirmed plan=${plan}`);
          await checkSubscription(); // update local state
          return plan as PlanId;
        }
        if (!expectedPlan && plan && plan !== 'free') {
          await checkSubscription();
          return plan as PlanId;
        }
      } catch (err) {
        log(`[Billing] Poll attempt ${i + 1} failed: ${err}`);
      }
      if (i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    // Final refresh even if not confirmed
    await checkSubscription();
    return null;
  }, [checkSubscription, log]);

  // ─── Native purchase via Despia + RevenueCat ──────────────────────
  const purchaseNative = useCallback(async (planId: PlanId, billingCycle: BillingCycle): Promise<{ confirmed: boolean }> => {
    if (!user?.id) throw new Error('User not authenticated');

    // Prevent double purchases
    if (purchaseInFlightRef.current) {
      log('[Billing] ⚠ Purchase already in progress — ignoring duplicate tap');
      return { confirmed: false };
    }
    purchaseInFlightRef.current = true;

    const productId = getNativeProductId(planId, billingCycle);
    log(`[Billing] Native purchase: plan=${planId}, cycle=${billingCycle}, productId=${productId}`);
    log(`[Billing] rc_purchase_path=native_despia, rc_web_fallback=false`);

    const despia = await getDespia();
    const url = `revenuecat://purchase?external_id=${encodeURIComponent(user.id)}&product=${encodeURIComponent(productId)}`;
    log(`[Billing] Calling despia purchase: product=${productId}, external_id=${user.id}`);

    return new Promise<{ confirmed: boolean }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        log('[Billing] ⚠ Native purchase callback timed out (120s). Checking backend…');
        cleanup();
        pollSubscriptionStatus(3, 2000, planId).then((confirmedPlan) => {
          resolve({ confirmed: confirmedPlan === planId });
        }).catch(() => resolve({ confirmed: false }));
      }, 120000);

      let settled = false;
      const settle = (fn: () => void) => { if (!settled) { settled = true; cleanup(); fn(); } };

      const cleanup = () => {
        clearTimeout(timeout);
        window.onRevenueCatPurchase = undefined;
        (window as any).onRevenueCatPaywallDismiss = undefined;
        purchaseInFlightRef.current = false;
      };

      window.onRevenueCatPurchase = () => {
        log('[Billing] ✓ onRevenueCatPurchase callback fired');
        settle(() => {
          pollSubscriptionStatus(6, 2500, planId)
            .then((confirmedPlan) => {
              if (confirmedPlan === planId) {
                log(`[Billing] ✓ Backend confirmed plan=${confirmedPlan}`);
                resolve({ confirmed: true });
              } else {
                log(`[Billing] ⚠ Backend plan=${confirmedPlan}, expected=${planId} — not confirmed yet`);
                resolve({ confirmed: false });
              }
            })
            .catch((err) => {
              log(`[Billing] ⚠ Backend polling failed: ${err}`);
              resolve({ confirmed: false });
            });
        });
      };

      // Handle user dismissing the Apple payment sheet without purchasing
      (window as any).onRevenueCatPaywallDismiss = () => {
        log('[Billing] Native purchase dismissed by user');
        settle(() => reject(new Error('cancelled')));
      };

      try {
        despia(url);
        log('[Billing] despia() call dispatched — waiting for callback…');
      } catch (err) {
        cleanup();
        const errObj = err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : err;
        log(`[Billing] ❌ despia() purchase failed: ${JSON.stringify(errObj)}`);
        reject(err);
      }
    });
  }, [user?.id, log, getDespia, pollSubscriptionStatus]);

  // ─── Launch native RevenueCat paywall ─────────────────────────────
  const launchNativePaywall = useCallback(async (offering = 'useRevenueCat') => {
    if (!user?.id) throw new Error('User not authenticated');
    if (!isDespia()) throw new Error('Native paywall only available on mobile');

    log(`[Billing] Launching native paywall: offering=${offering}, rc_purchase_path=native_paywall, rc_web_fallback=false`);
    const despia = await getDespia();

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => { if (!settled) { settled = true; cleanup(); fn(); } };

      const timeout = setTimeout(() => {
        log('[Billing] ⚠ Native paywall timed out (180s) — treating as dismiss');
        settle(() => reject(new Error('cancelled')));
      }, 180000);

      const cleanup = () => {
        clearTimeout(timeout);
        window.onRevenueCatPurchase = undefined;
        (window as any).onRevenueCatPaywallDismiss = undefined;
      };

      window.onRevenueCatPurchase = () => {
        log('[Billing] ✓ Purchase via native paywall');
        settle(() => {
          pollSubscriptionStatus(5, 2000).then(() => resolve()).catch(() => resolve());
        });
      };

      // Dismiss without purchase → reject with cancellation so fallback does NOT fire
      (window as any).onRevenueCatPaywallDismiss = () => {
        log('[Billing] Native paywall dismissed without purchase');
        settle(() => reject(new Error('cancelled')));
      };

      try {
        despia(`revenuecat://launchPaywall?external_id=${encodeURIComponent(user.id)}&offering=${encodeURIComponent(offering)}`);
        log('[Billing] Native paywall launched');
      } catch (err) {
        cleanup();
        log(`[Billing] ❌ launchPaywall failed: ${err}`);
        reject(err);
      }
    });
  }, [user?.id, log, getDespia, checkSubscription, pollSubscriptionStatus]);

  // ─── Web purchase via Stripe ──────────────────────────────────────
  const purchaseWeb = useCallback(async (planId: PlanId, billingCycle: BillingCycle) => {
    log(`[Billing] Web purchase (Stripe): plan=${planId}, cycle=${billingCycle}`);
    await createCheckout(planId, billingCycle);
    log('[Billing] ✓ Stripe checkout initiated');
  }, [createCheckout, log]);

  // ─── Unified purchase ─────────────────────────────────────────────
  const purchasePlan = useCallback(async (planId: PlanId, billingCycle: BillingCycle): Promise<{ confirmed: boolean }> => {
    const diag = getDiagnostics();
    log(`[Billing] purchasePlan: plan=${planId}, cycle=${billingCycle}, platform=${diag.platform}`);
    log(`[Billing] rc_platform_detected=${diag.platform}, rc_native_available=${diag.isDespia}, isDespiaIOS=${diag.isDespiaIOS}, isDespiaAndroid=${diag.isDespiaAndroid}`);

    // Prevent double taps
    if (isPurchasing || purchaseInFlightRef.current) {
      log('[Billing] ⚠ Already purchasing — ignoring');
      return { confirmed: false };
    }

    setIsPurchasing(true);
    setLastPurchaseResult('idle');
    try {
      if (diag.isDespia) {
        const result = await purchaseNative(planId, billingCycle);
        if (result.confirmed) {
          setLastPurchaseResult('success');
          toast.success(`You're now subscribed to ${planId === 'elite' ? 'Elite' : 'Pro'}! 🎉`);
          return { confirmed: true };
        } else {
          setLastPurchaseResult('idle');
          log('[Billing] ⚠ Purchase callback fired but backend not yet confirmed — no success toast');
          toast.info('Your purchase is being processed. It may take a moment to activate.');
          return { confirmed: false };
        }
      } else {
        await purchaseWeb(planId, billingCycle);
        setLastPurchaseResult('success');
        toast.success('Redirecting to checkout…');
        return { confirmed: true };
      }
    } catch (err) {
      if (isUserCancellation(err)) {
        log('[Billing] Purchase cancelled by user');
        setLastPurchaseResult('cancelled');
        return { confirmed: false };
      }

      const friendlyMsg = getUserErrorMessage(err);
      const errObj = err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : err;
      log(`[Billing] ❌ Purchase error (full): ${JSON.stringify(errObj)}`);
      setLastPurchaseResult('error');
      toast.error(friendlyMsg);
      throw err;
    } finally {
      setIsPurchasing(false);
      purchaseInFlightRef.current = false;
    }
  }, [log, purchaseNative, purchaseWeb, isPurchasing]);

  // ─── Restore purchases (native only) ─────────────────────────────
  const restorePurchases = useCallback(async (): Promise<RestoredPurchase[]> => {
    if (!isDespia()) {
      log('[Billing] Restore not available on web');
      throw new Error('Restore purchases is only available on mobile');
    }

    log('[Billing] Restoring purchases…');
    setIsRestoring(true);

    try {
      const despia = await getDespia();
      const data = await despia('getpurchasehistory://', ['restoredData']);
      const purchases: RestoredPurchase[] = data?.restoredData ?? [];
      const activePurchases = purchases.filter((p) => p.isActive);

      log(`[Billing] Restore returned ${purchases.length} total, ${activePurchases.length} active`);

      activePurchases.forEach((p, i) => {
        log(`[Billing]   [${i}] entitlementId=${p.entitlementId}, productId=${p.productId}, isActive=${p.isActive}`);
      });

      // Trigger backend reconciliation
      log('[Billing] Refreshing backend after restore…');
      await checkSubscription();
      log('[Billing] ✓ Backend refresh after restore complete');

      return purchases;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      log(`[Billing] ❌ Restore error: ${msg}`);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, [log, getDespia, checkSubscription]);

  // ─── Refresh subscription status ──────────────────────────────────
  const refreshSubscriptionStatus = useCallback(async () => {
    log('[Billing] Refreshing subscription status from backend…');
    try {
      await checkSubscription();
      log('[Billing] ✓ Subscription status refreshed');
    } catch (err) {
      log(`[Billing] ❌ Refresh error: ${err}`);
      throw err;
    }
  }, [checkSubscription, log]);

  return {
    purchasePlan,
    launchNativePaywall,
    restorePurchases,
    refreshSubscriptionStatus,
    diagnostics: getDiagnostics(),
    debugLog,
    isPurchasing,
    isRestoring,
    isNative: isDespia(),
    lastPurchaseResult,
  };
}
