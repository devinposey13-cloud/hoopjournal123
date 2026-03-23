/**
 * Unified billing hook — Despia + RevenueCat for native, Stripe for web.
 *
 * This replaces the old useRevenueCat hook entirely.
 * Backend (plan_overrides table) is the source of truth for access.
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
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
  /** Purchase a plan. Routes to Despia/RC on native, Stripe on web. */
  purchasePlan: (planId: PlanId, billingCycle: BillingCycle) => Promise<void>;
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
}

export function useBilling(): UseBillingReturn {
  const { user } = useAuth();
  const { createCheckout, checkSubscription } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const despiaRef = useRef<any>(null);

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

  // ─── Native purchase via Despia + RevenueCat ──────────────────────
  const purchaseNative = useCallback(async (planId: PlanId, billingCycle: BillingCycle) => {
    if (!user?.id) throw new Error('User not authenticated');

    const productId = getNativeProductId(planId, billingCycle);
    log(`[Billing] Native purchase: plan=${planId}, cycle=${billingCycle}, productId=${productId}, userId=${user.id.slice(0, 8)}…`);

    const despia = await getDespia();
    const url = `revenuecat://purchase?external_id=${encodeURIComponent(user.id)}&product=${encodeURIComponent(productId)}`;
    log(`[Billing] Calling despia("${url}")`);

    // Set up the global callback BEFORE triggering purchase
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        log('[Billing] ⚠ Native purchase callback timed out (120s). Checking backend…');
        cleanup();
        // Don't reject — just refresh and let user know
        checkSubscription().then(() => {
          log('[Billing] Backend refresh completed after timeout');
          resolve();
        }).catch(reject);
      }, 120000);

      const cleanup = () => {
        clearTimeout(timeout);
        window.onRevenueCatPurchase = undefined;
      };

      window.onRevenueCatPurchase = () => {
        log('[Billing] ✓ onRevenueCatPurchase callback fired — refreshing backend status…');
        cleanup();
        // Don't unlock immediately — wait for backend confirmation
        pollSubscriptionStatus(5, 2000)
          .then(() => {
            log('[Billing] ✓ Backend confirmed subscription update');
            resolve();
          })
          .catch((err) => {
            log(`[Billing] ⚠ Backend polling failed: ${err}. User should check status manually.`);
            resolve(); // still resolve — the webhook will catch up
          });
      };

      try {
        despia(url);
        log('[Billing] despia() call dispatched — waiting for onRevenueCatPurchase callback…');
      } catch (err) {
        cleanup();
        log(`[Billing] ❌ despia() call failed: ${err}`);
        reject(err);
      }
    });
  }, [user?.id, log, getDespia, checkSubscription]);

  // Poll backend for subscription update
  const pollSubscriptionStatus = useCallback(async (maxAttempts: number, delayMs: number) => {
    for (let i = 0; i < maxAttempts; i++) {
      log(`[Billing] Polling backend (${i + 1}/${maxAttempts})…`);
      await checkSubscription();
      // Small delay between polls
      if (i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }, [checkSubscription, log]);

  // ─── Web purchase via Stripe ──────────────────────────────────────
  const purchaseWeb = useCallback(async (planId: PlanId, billingCycle: BillingCycle) => {
    log(`[Billing] Web purchase (Stripe): plan=${planId}, cycle=${billingCycle}`);
    await createCheckout(planId, billingCycle);
    log('[Billing] ✓ Stripe checkout initiated');
  }, [createCheckout, log]);

  // ─── Unified purchase ─────────────────────────────────────────────
  const purchasePlan = useCallback(async (planId: PlanId, billingCycle: BillingCycle) => {
    const diag = getDiagnostics();
    log(`[Billing] purchasePlan: plan=${planId}, cycle=${billingCycle}, platform=${diag.platform}, isDespia=${diag.isDespia}`);

    setIsPurchasing(true);
    try {
      if (diag.isDespia) {
        await purchaseNative(planId, billingCycle);
        toast.success('Purchase successful! 🎉');
      } else {
        await purchaseWeb(planId, billingCycle);
        toast.success('Redirecting to checkout…');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      log(`[Billing] ❌ Purchase error: ${msg}`);
      if (!msg.includes('cancelled') && !msg.includes('canceled')) {
        toast.error(msg);
      }
      throw err;
    } finally {
      setIsPurchasing(false);
    }
  }, [log, purchaseNative, purchaseWeb]);

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

      log(`[Billing] Restore returned ${purchases.length} purchase(s)`);

      purchases.forEach((p, i) => {
        log(`[Billing]   [${i}] productId=${p.productId}, isActive=${p.isActive}, willRenew=${p.willRenew}, expires=${p.expirationDate}`);
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
    restorePurchases,
    refreshSubscriptionStatus,
    diagnostics: getDiagnostics(),
    debugLog,
    isPurchasing,
    isRestoring,
    isNative: isDespia(),
  };
}
