/**
 * Unified billing hook — Despia + RevenueCat for native, Stripe for web.
 *
 * This replaces the old useRevenueCat hook entirely.
 * Backend (plan_overrides table) is the source of truth for access.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { isDespia, isDespiaIOS, isDespiaAndroid, isWeb, getPlatform } from '@/lib/platform';
import { type PlanId, type BillingCycle } from '@/lib/plans';
import { toast } from 'sonner';
import {
  startDebugSession,
  updateSession,
  endSession,
  dbg,
  dbgError,
  checkCallbackRegistration,
  recordEntitlementCheck,
  recordLifecycleEvent,
  recordPlanChange,
  getCurrentDebugSession,
  type DebugSession,
} from '@/lib/purchaseDebug';

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
  // Android prefixed variants (legacy)
  'premium:HoopJ_pro_monthly': 'pro',
  'premium:HoopJ_pro_yearly': 'pro',
  'premium:HoopJ_elite_monthly': 'elite',
  'premium:HoopJ_elite_yearly': 'elite',
  'premium:hj_pro_monthly': 'pro',
  'premium:hj_pro_yearly': 'pro',
  'premium:hj_elite_monthly': 'elite',
  'premium:hj_elite_yearly': 'elite',
  // Google Play Store product IDs (RevenueCat)
  'pro_monthly:promonthly': 'pro',
  'pro_monthly:proyearly': 'pro',
  'pro_monthly:elitemonthly': 'elite',
  'pro_monthly:eliteyearly': 'elite',
};

// Internal plan + billing → store product ID
function getNativeProductId(planId: PlanId, billingCycle: BillingCycle): string {
  if (isDespiaAndroid()) {
    // Google Play Store product IDs from RevenueCat
    const androidMap: Record<string, Record<string, string>> = {
      pro: { monthly: 'pro_monthly:promonthly', yearly: 'pro_monthly:proyearly' },
      elite: { monthly: 'pro_monthly:elitemonthly', yearly: 'pro_monthly:eliteyearly' },
    };
    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    return androidMap[planId]?.[cycle] ?? `premium:HoopJ_${planId}_${cycle}`;
  }
  const base = `HoopJ_${planId}_${billingCycle === 'yearly' ? 'yearly' : 'monthly'}`;
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
  /** Force reset all purchase state (emergency recovery). */
  forceResetPurchaseState: () => void;
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

// Module-level flag shared across all useBilling() instances to prevent
// stale per-instance refs from blocking purchases after cancellation
let globalPurchaseInFlight = false;

export function useBilling(): UseBillingReturn {
  const { user } = useAuth();
  const { createCheckout, checkSubscription, planType: currentBackendPlan } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastPurchaseResult, setLastPurchaseResult] = useState<'idle' | 'success' | 'cancelled' | 'error'>('idle');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const despiaRef = useRef<any>(null);
  const prevPlanRef = useRef<string | null>(null);

  const log = useCallback((msg: string) => {
    const entry = `${new Date().toISOString().slice(11, 19)} ${msg}`;
    console.log(msg);
    setDebugLog((prev) => [...prev, entry]);
  }, []);

  // ─── Section 9: Plan state change tracking ───────────────────────
  useEffect(() => {
    const prev = prevPlanRef.current;
    const curr = currentBackendPlan || null;
    if (prev !== curr && prev !== null) {
      recordPlanChange(prev, curr, 'subscription_hook');
    }
    prevPlanRef.current = curr;
  }, [currentBackendPlan]);

  // Lazy-load despia-native
  const getDespia = useCallback(async () => {
    if (despiaRef.current) return despiaRef.current;
    try {
      const mod = await import('despia-native');
      despiaRef.current = mod.default || mod;
      return despiaRef.current;
    } catch (err) {
      log(`[Billing] ❌ Failed to import despia-native: ${err}`);
      dbgError('despia-native import failed', err);
      throw new Error('Despia SDK not available');
    }
  }, [log]);

  // ─── Entitlement check via despia ────────────────────────────────
  const runEntitlementCheck = useCallback(async (trigger: string) => {
    if (!isDespia()) return null;
    try {
      const despia = await getDespia();
      dbg(`Running entitlement check [${trigger}]`);
      const data = await despia('getpurchasehistory://', ['restoredData']);
      return recordEntitlementCheck(trigger, data);
    } catch (err) {
      dbgError(`Entitlement check [${trigger}] failed`, err);
      return null;
    }
  }, [getDespia]);

  // Poll backend for subscription update — returns the confirmed plan or null
  const pollSubscriptionStatus = useCallback(async (maxAttempts: number, delayMs: number, expectedPlan?: PlanId): Promise<PlanId | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      log(`[Billing] Polling backend (${i + 1}/${maxAttempts})…`);
      dbg(`Backend poll ${i + 1}/${maxAttempts}`);
      try {
        const { data } = await supabase.functions.invoke('check-subscription');
        const rawPlan = (data?.plan_type as string) || null;
        const plan = rawPlan === 'starter' ? 'pro' : rawPlan;
        log(`[Billing] Backend plan: ${plan}, expected: ${expectedPlan || 'any'}`);
        dbg('Backend poll result', { plan, expected: expectedPlan, raw: rawPlan });
        if (expectedPlan && plan === expectedPlan) {
          log(`[Billing] ✓ Backend confirmed plan=${plan}`);
          recordPlanChange(prevPlanRef.current, plan, 'backend_poll');
          await checkSubscription();
          return plan as PlanId;
        }
        if (!expectedPlan && plan && plan !== 'free') {
          recordPlanChange(prevPlanRef.current, plan, 'backend_poll');
          await checkSubscription();
          return plan as PlanId;
        }
      } catch (err) {
        log(`[Billing] Poll attempt ${i + 1} failed: ${err}`);
        dbgError(`Poll attempt ${i + 1}`, err);
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

    if (globalPurchaseInFlight) {
      log('[Billing] ⚠ Purchase already in progress — ignoring duplicate tap');
      dbg('Duplicate purchase blocked (globalPurchaseInFlight=true)');
      return { confirmed: false };
    }
    globalPurchaseInFlight = true;

    const productId = getNativeProductId(planId, billingCycle);

    // ─── Section 1: Start debug session ─────────────────────────
    const session = startDebugSession({
      userId: user.id,
      offeringId: `${planId}_${billingCycle}`,
      productId,
    });

    log(`[Billing] selected_package productId=${productId} plan=${planId} cycle=${billingCycle}`);
    log('[Billing] rc_purchase_path=native_despia, rc_web_fallback=false');

    // ─── Section 3: Pre-launch state check ──────────────────────
    const preCheck = {
      userId: user.id,
      productId,
      planId,
      billingCycle,
      isAlreadyPremium: currentBackendPlan ? currentBackendPlan !== 'free' : false,
      networkOnline: navigator.onLine,
      bridgeAvailable: isDespia(),
      platformDetected: getPlatform(),
    };
    dbg('Pre-launch state check', preCheck);
    if (!preCheck.networkOnline) {
      dbg('⚠️ Network appears OFFLINE before purchase launch');
    }
    if (!preCheck.bridgeAvailable) {
      dbgError('Bridge not available', 'isDespia() returned false despite native purchase path');
    }

    // ─── Section 6: Pre-launch entitlement check ────────────────
    await runEntitlementCheck('pre_launch');

    const despia = await getDespia();
    const url = `revenuecat://purchase?external_id=${encodeURIComponent(user.id)}&product=${encodeURIComponent(productId)}`;

    return new Promise<{ confirmed: boolean }>((resolve, reject) => {
      let settled = false;
      let returnCheckStarted = false;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
      let appWasHidden = document.visibilityState === 'hidden';
      const launchedAt = Date.now();

      const clearFallbackTimer = () => {
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
      };

      // ─── Section 5: Callback execution logging ─────────────────
      const handlePurchaseCallback = () => {
        const elapsed = Date.now() - launchedAt;
        dbg('✓ Purchase callback received', {
          elapsedMs: elapsed,
          sessionId: session.id,
        });
        updateSession({
          callbackReceived: true,
          callbackReceivedAt: new Date().toISOString(),
          status: 'callback_received',
        });

        // Check what arguments we got (native may pass data)
        const args = arguments;
        dbg('Callback arguments', { argCount: args.length, args: Array.from(args) });
        updateSession({ callbackPayload: Array.from(args) });

        log('[Billing] ✓ onRevenueCatPurchase callback fired');

        // ─── Section 6: Post-callback entitlement check ──────────
        runEntitlementCheck('post_callback');

        settle(() => {
          pollSubscriptionStatus(6, 2500, planId)
            .then((confirmedPlan) => {
              if (confirmedPlan === planId) {
                log(`[Billing] ✓ Backend confirmed plan=${confirmedPlan}`);
                recordPlanChange(prevPlanRef.current, confirmedPlan, 'callback_confirmed');
                updateSession({ status: 'confirmed', premiumStateUpdated: true });
                endSession();
                resolve({ confirmed: true });
              } else {
                log(`[Billing] ⚠ Backend plan=${confirmedPlan}, expected=${planId} — not confirmed yet`);
                updateSession({ status: 'entitlement_found_ui_not_updated' });
                endSession();
                resolve({ confirmed: false });
              }
            })
            .catch((err) => {
              log(`[Billing] ⚠ Backend polling failed: ${err}`);
              dbgError('Backend polling after callback', err);
              endSession();
              resolve({ confirmed: false });
            });
        });
      };

      const handleDismissCallback = () => {
        dbg('Paywall dismiss callback fired');
        recordLifecycleEvent('paywall_dismiss');
        runReturnCheck('onRevenueCatPaywallDismiss', 250);
      };

      // ─── Section 2: Register error callback ───────────────────
      window.onRevenueCatPurchaseError = (err: any) => {
        dbgError('Native purchase error callback', err);
        updateSession({ lastError: err?.message || String(err), status: 'error' });
        log(`[Billing] ❌ onRevenueCatPurchaseError fired: ${JSON.stringify(err)}`);
      };

      // Touch-based return detector
      const onTouchReturn = () => {
        if (!settled && Date.now() - launchedAt > 1500) {
          log('[Billing] touch_return_detected — user regained control');
          recordLifecycleEvent('touch_return');
          runReturnCheck('touch_return', 400);
        }
      };

      const onPossibleReturn = () => {
        if (!settled && Date.now() - launchedAt > 1000) {
          recordLifecycleEvent('focus_return');
          runReturnCheck('focus_return');
        }
      };

      // ─── Section 7: Lifecycle event tracking ───────────────────
      const onVisibilityChange = () => {
        recordLifecycleEvent('visibilitychange');
        if (document.visibilityState === 'hidden') {
          appWasHidden = true;
          return;
        }
        if (document.visibilityState === 'visible' && !settled && (appWasHidden || Date.now() - launchedAt > 1000)) {
          // ─── Section 6: Post-resume entitlement check ──────────
          runEntitlementCheck('app_resume');
          runReturnCheck('visibility_return');
        }
      };

      const onBlur = () => recordLifecycleEvent('blur');

      const cleanup = () => {
        clearFallbackTimer();
        if (timeout) clearTimeout(timeout);
        if (watchdogTimer) clearTimeout(watchdogTimer);
        window.removeEventListener('focus', onPossibleReturn);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('pageshow', onPossibleReturn);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        document.removeEventListener('touchstart', onTouchReturn);
        document.removeEventListener('pointerdown', onTouchReturn);
        if (window.onRevenueCatPurchase === handlePurchaseCallback) {
          window.onRevenueCatPurchase = undefined;
        }
        if ((window as any).onRevenueCatPaywallDismiss === handleDismissCallback) {
          (window as any).onRevenueCatPaywallDismiss = undefined;
        }
        window.onRevenueCatPurchaseError = undefined;
        globalPurchaseInFlight = false;
        log('[Billing] purchase_state_reset');
      };

      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true;
          cleanup();
          fn();
        }
      };

      function runReturnCheck(reason: string, delayMs = 1200) {
        if (settled || returnCheckStarted) return;
        returnCheckStarted = true;
        clearFallbackTimer();
        fallbackTimer = setTimeout(async () => {
          if (settled) return;
          log(`[Billing] purchase_sheet_dismissed source=${reason}`);
          dbg(`Return check [${reason}]`);
          try {
            // ─── Section 6: Post-dismiss entitlement check ───────
            await runEntitlementCheck('post_dismiss_' + reason);

            const confirmedPlan = await pollSubscriptionStatus(2, 1000, planId);
            if (settled) return;
            if (confirmedPlan === planId) {
              log(`[Billing] ✓ Backend confirmed plan=${confirmedPlan} after ${reason}`);
              updateSession({ status: 'confirmed', premiumStateUpdated: true });
              endSession();
              settle(() => resolve({ confirmed: true }));
              return;
            }
          } catch (err) {
            log(`[Billing] ⚠ Return check polling failed after ${reason}: ${err}`);
            dbgError(`Return check [${reason}]`, err);
          }
          updateSession({ status: 'paywall_closed_no_purchase' });
          endSession();
          settle(() => reject(new Error('cancelled')));
        }, delayMs);
      }

      // ─── Section 8: Main timeout (120s) ────────────────────────
      timeout = setTimeout(() => {
        log('[Billing] ⚠ Native purchase callback timed out (120s). Checking backend…');
        dbg('⚠ TIMEOUT: 120s elapsed without callback');
        updateSession({ timeoutTriggered: true, status: 'callback_missing' });
        runEntitlementCheck('timeout_120s');
        settle(() => {
          pollSubscriptionStatus(3, 2000, planId)
            .then((confirmedPlan) => {
              if (confirmedPlan === planId) {
                updateSession({ status: 'purchase_may_have_completed', premiumStateUpdated: true });
              }
              endSession();
              resolve({ confirmed: confirmedPlan === planId });
            })
            .catch(() => {
              endSession();
              resolve({ confirmed: false });
            });
        });
      }, 120000);

      // ─── Section 8: Early watchdog (12s) ───────────────────────
      watchdogTimer = setTimeout(async () => {
        if (settled) return;
        const session = getCurrentDebugSession();
        if (session && !session.callbackReceived) {
          dbg('⚠ WATCHDOG: 12s elapsed, no callback received yet');
          updateSession({ status: 'waiting_for_callback' });
          log('[Billing] ⚠ Watchdog: No purchase callback received within 12s');
          // Run fallback entitlement check
          const result = await runEntitlementCheck('watchdog_12s');
          if (result?.premiumFound) {
            dbg('Watchdog: entitlement found despite no callback!');
            log('[Billing] ⚠ Watchdog: Active entitlement found but callback never fired');
            updateSession({ status: 'purchase_may_have_completed' });
          }
        }
      }, 12000);

      // ─── Section 7: Register lifecycle listeners ───────────────
      window.addEventListener('focus', onPossibleReturn);
      window.addEventListener('blur', onBlur);
      window.addEventListener('pageshow', onPossibleReturn);
      document.addEventListener('visibilitychange', onVisibilityChange);
      document.addEventListener('touchstart', onTouchReturn, { passive: true });
      document.addEventListener('pointerdown', onTouchReturn, { passive: true });

      // ─── Section 2: Register callbacks with logging ────────────
      window.onRevenueCatPurchase = handlePurchaseCallback;
      (window as any).onRevenueCatPaywallDismiss = handleDismissCallback;

      updateSession({
        callbackRegistered: true,
        callbackRegisteredAt: new Date().toISOString(),
      });

      const cbCheck = checkCallbackRegistration();
      if (!cbCheck.purchaseCallbackExists) {
        dbg('⚠️ HIGH PRIORITY: Callback not registered despite assignment!');
      }

      // ─── Section 4: Dispatch despia() ──────────────────────────
      try {
        const dispatchStart = Date.now();
        dbg('Dispatching despia()', { url });
        log(`[Billing] purchase_sheet_opened productId=${productId}`);

        updateSession({ paywallLaunched: true, paywallLaunchedAt: new Date().toISOString(), status: 'launching' });

        const despiaResult = despia(url);
        const dispatchMs = Date.now() - dispatchStart;

        dbg('despia() returned', {
          elapsedMs: dispatchMs,
          resultType: typeof despiaResult,
          result: despiaResult,
        });
        updateSession({
          despiaDispatchMs: dispatchMs,
          despiaResult: JSON.stringify(despiaResult) || 'void',
          lastDespiaResult: JSON.stringify(despiaResult) || 'void',
          status: 'waiting_for_callback',
        });

        log('[Billing] despia() call dispatched — waiting for callback…');

        // If despia resolved immediately, note it
        if (dispatchMs < 5) {
          dbg('⚠ despia() resolved in <5ms — may be synchronous/no-op');
        }
      } catch (err) {
        const errObj = err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : err;
        dbgError('despia() launch threw', err);
        updateSession({ lastError: String(err), status: 'error' });
        log(`[Billing] purchase_error trigger_failed=${JSON.stringify(errObj)}`);
        endSession();
        settle(() => reject(err));
      }
    });
  }, [user?.id, log, getDespia, pollSubscriptionStatus, runEntitlementCheck, currentBackendPlan]);

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

    if (isPurchasing || globalPurchaseInFlight) {
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
        }

        setLastPurchaseResult('idle');
        log('[Billing] ⚠ Purchase callback fired but backend not yet confirmed — no success toast');
        toast.info('Your purchase is being processed. It may take a moment to activate.');
        return { confirmed: false };
      }

      await purchaseWeb(planId, billingCycle);
      setLastPurchaseResult('success');
      toast.success('Redirecting to checkout…');
      return { confirmed: true };
    } catch (err) {
      if (isUserCancellation(err)) {
        log('[Billing] purchase_cancelled');
        setLastPurchaseResult('cancelled');
        return { confirmed: false };
      }

      const friendlyMsg = getUserErrorMessage(err);
      const errObj = err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : err;
      log(`[Billing] purchase_error full=${JSON.stringify(errObj)}`);
      setLastPurchaseResult('error');
      toast.error(friendlyMsg);
      throw err;
    } finally {
      setIsPurchasing(false);
      globalPurchaseInFlight = false;
      log('[Billing] buttons_reenabled');
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
      recordEntitlementCheck('manual_restore', data);

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
      dbgError('Restore purchases', err);
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

  // ─── Force reset all purchase state (emergency recovery) ─────────
  const forceResetPurchaseState = useCallback(() => {
    log('[Billing] paywall_soft_reset_started');
    dbg('Force reset purchase state');
    globalPurchaseInFlight = false;
    setIsPurchasing(false);
    setIsRestoring(false);
    setLastPurchaseResult('idle');
    // Clean up any lingering native callbacks
    window.onRevenueCatPurchase = undefined;
    (window as any).onRevenueCatPaywallDismiss = undefined;
    window.onRevenueCatPurchaseError = undefined;
    log('[Billing] paywall_soft_reset_completed');
  }, [log]);

  return {
    purchasePlan,
    launchNativePaywall,
    restorePurchases,
    refreshSubscriptionStatus,
    forceResetPurchaseState,
    diagnostics: getDiagnostics(),
    debugLog,
    isPurchasing,
    isRestoring,
    isNative: isDespia(),
    lastPurchaseResult,
  };
}
