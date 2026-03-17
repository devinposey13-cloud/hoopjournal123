/**
 * RevenueCat integration hook for native (Capacitor) in-app purchases.
 *
 * On web this hook is a no-op — all purchase flows go through Stripe.
 * On native, it lazily loads @revenuecat/purchases-capacitor, waits for the
 * Capacitor runtime to actually be native, and exposes purchase / restore helpers.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  getCapacitorRuntimePlatform,
  getPlatform,
  isCapacitorNativeRuntime,
  isNativeApp,
} from '@/lib/platform';
import { useAuth } from '@/hooks/useAuth';
import type { PlanId } from '@/lib/plans';

// RevenueCat publishable iOS API key — safe to embed in client code
const REVENUECAT_IOS_API_KEY = 'appl_trLLQaYmhqUNbauTXJrRmKaqlKj';

// Map RevenueCat product identifiers → internal plan IDs
export const RC_PRODUCT_TO_PLAN: Record<string, PlanId> = {
  // New product IDs (March 2026)
  HoopJ_pro_monthly: 'pro',
  HoopJ_pro_yearly: 'pro',
  HoopJ_elite_monthly: 'elite',
  HoopJ_elite_yearly: 'elite',
  // Legacy product IDs (keep for existing subscribers)
  hj_starter_monthly: 'pro',
  hj_starter_yearly: 'pro',
  hj_pro_monthly: 'pro',
  hj_pro_yearly: 'pro',
  hj_elite_monthly: 'elite',
  hj_elite_yearly: 'elite',
};

export interface RCPackage {
  identifier: string;
  productId: string;
  priceString: string;
  /** Period label e.g. "Monthly", "Annual" */
  period: string;
  planId: PlanId;
}

export interface RevenueCatDiagnostics {
  shellPlatform: 'ios' | 'android' | 'web';
  runtimePlatform: 'ios' | 'android' | 'web';
  shellNative: boolean;
  runtimeNative: boolean;
  webkitDetected: boolean;
}

export interface UseRevenueCatReturn {
  isAvailable: boolean;
  offerings: RCPackage[];
  isLoading: boolean;
  purchasePackage: (packageId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  retryInit: () => void;
  debugLog: string[];
  diagnostics: RevenueCatDiagnostics;
  statusReason: string | null;
}

function getDiagnostics(): RevenueCatDiagnostics {
  return {
    shellPlatform: getPlatform(),
    runtimePlatform: getCapacitorRuntimePlatform(),
    shellNative: isNativeApp(),
    runtimeNative: isCapacitorNativeRuntime(),
    webkitDetected: typeof window !== 'undefined' && !!window.webkit?.messageHandlers,
  };
}

/**
 * On web, returns a stub with isAvailable=false.
 * On native, lazily loads @revenuecat/purchases-capacitor.
 */
export function useRevenueCat(): UseRevenueCatReturn {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [offerings, setOfferings] = useState<RCPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [purchases, setPurchases] = useState<any>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [statusReason, setStatusReason] = useState<string | null>(null);
  const initAttemptRef = useRef(0);

  const log = useCallback((msg: string) => {
    console.log(msg);
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  }, []);

  const retryInit = useCallback(() => {
    setStatusReason(null);
    log('[RC] Manual retry triggered');
    setRetryTrigger((v) => v + 1);
  }, [log]);

  useEffect(() => {
    const diagnostics = getDiagnostics();
    const attempt = ++initAttemptRef.current;

    log(
      `[RC] Init attempt #${attempt} | shellNative: ${diagnostics.shellNative}, shellPlatform: ${diagnostics.shellPlatform}, runtimeNative: ${diagnostics.runtimeNative}, runtimePlatform: ${diagnostics.runtimePlatform}, webkit: ${diagnostics.webkitDetected}`
    );

    if (!diagnostics.shellNative) {
      setIsAvailable(false);
      setOfferings([]);
      setPurchases(null);
      log('[RC] Skipping init — not in native shell');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setIsAvailable(false);
        setOfferings([]);
        setPurchases(null);

        const MAX_RUNTIME_RETRIES = 8;
        const RETRY_DELAY = 600;
        let runtimeReady = false;
        let lastRuntimePlatform: 'ios' | 'android' | 'web' = diagnostics.runtimePlatform;

        for (let i = 0; i < MAX_RUNTIME_RETRIES; i++) {
          if (cancelled) return;

          const runtimePlatform = getCapacitorRuntimePlatform();
          const runtimeNative = isCapacitorNativeRuntime();
          lastRuntimePlatform = runtimePlatform;

          log(
            `[RC] Runtime check ${i + 1}/${MAX_RUNTIME_RETRIES}: platform=${runtimePlatform}, native=${runtimeNative ? '✓' : '✗'}`
          );

          if (runtimeNative && (runtimePlatform === 'ios' || runtimePlatform === 'android')) {
            runtimeReady = true;
            break;
          }

          if (i < MAX_RUNTIME_RETRIES - 1) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          }
        }

        if (!runtimeReady) {
          log(
            `[RC] ❌ Capacitor runtime stayed on '${lastRuntimePlatform}'. Native shell detected, but RevenueCat would use Capacitor WEB implementation in this build.`
          );
          log('[RC] Root cause: shell/native heuristics are true, but Capacitor runtime is not native for this plugin.');
          return;
        }

        log('[RC] Importing purchases-capacitor…');
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        if (cancelled) return;
        log('[RC] Import OK');

        const PLUGIN_NAME = 'Purchases';
        const MAX_PLUGIN_RETRIES = 8;
        let bridgeReady = false;

        for (let i = 0; i < MAX_PLUGIN_RETRIES; i++) {
          if (cancelled) return;

          const available = Capacitor.isPluginAvailable(PLUGIN_NAME);
          log(
            `[RC] Bridge check ${i + 1}/${MAX_PLUGIN_RETRIES} for '${PLUGIN_NAME}': ${available ? '✓ available' : '✗ not yet'} | runtime=${getCapacitorRuntimePlatform()}`
          );

          if (available) {
            bridgeReady = true;
            break;
          }

          if (i < MAX_PLUGIN_RETRIES - 1) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          }
        }

        if (!bridgeReady) {
          log('[RC] Bridge not in registry. Attempting direct configure() as fallback…');
          try {
            await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
            log('[RC] Direct configure() succeeded despite registry miss ✓');
            bridgeReady = true;
          } catch (directErr) {
            const errMsg = directErr instanceof Error ? directErr.message : String(directErr);
            log(`[RC] ❌ Direct configure() also failed: ${errMsg}`);
            if (errMsg.includes('Web not supported in this plugin')) {
              log(
                `[RC] ❌ Exact cause: RevenueCat resolved to the Capacitor WEB implementation while shellPlatform=${getPlatform()} and runtimePlatform=${getCapacitorRuntimePlatform()}.`
              );
            }
            if (errMsg.includes('Web') || errMsg.includes('not implemented') || errMsg.includes('Unimplemented')) {
              log('[RC] ❌ Native RevenueCat module is unavailable in this build/runtime.');
            }
            return;
          }
        }

        if (cancelled) return;

        if (bridgeReady && !purchases) {
          try {
            log('[RC] Configuring with API key…');
            await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
            log('[RC] Configured ✓');
          } catch (configErr) {
            const msg = configErr instanceof Error ? configErr.message : String(configErr);
            if (msg.includes('already configured') || msg.includes('Already configured')) {
              log('[RC] Already configured (expected) ✓');
            } else {
              log(`[RC] ❌ Configure error: ${msg}`);
              if (msg.includes('Web not supported in this plugin')) {
                log(
                  `[RC] ❌ Exact cause: Purchases.configure() hit the WEB implementation. shellPlatform=${getPlatform()}, runtimePlatform=${getCapacitorRuntimePlatform()}, runtimeNative=${isCapacitorNativeRuntime()}.`
                );
              }
              return;
            }
          }
        }

        if (cancelled) return;
        setPurchases(Purchases);
        setIsAvailable(true);

        if (user?.id) {
          log(`[RC] Logging in user: ${user.id.slice(0, 8)}…`);
          try {
            await Purchases.logIn({ appUserID: user.id });
            log('[RC] User logged in ✓');
          } catch (loginErr) {
            log(`[RC] ⚠ Login error (non-fatal): ${loginErr instanceof Error ? loginErr.message : String(loginErr)}`);
          }
        }

        log('[RC] Fetching offerings…');
        const rcOfferings = await Purchases.getOfferings();
        const current = (rcOfferings as any)?.current;
        const allPkgs = current?.availablePackages ?? [];
        log(`[RC] Offerings: current=${!!current}, packages=${allPkgs.length}`);
        log(`[RC] Raw offerings response: ${JSON.stringify(rcOfferings)}`);

        if (allPkgs.length === 0) {
          log(`[RC] Raw offerings keys: ${Object.keys(rcOfferings || {}).join(', ')}`);
          const allOfferings = (rcOfferings as any)?.all;
          if (allOfferings) {
            const offeringKeys = Object.keys(allOfferings);
            log(`[RC] All offerings: ${offeringKeys.join(', ')} (${offeringKeys.length} total)`);
            offeringKeys.forEach((key) => {
              const offering = allOfferings[key];
              const pkgCount = offering?.availablePackages?.length ?? 0;
              log(`[RC]   offering '${key}': ${pkgCount} packages`);
            });
          }
        }

        allPkgs.forEach((pkg: any, idx: number) => {
          const productId = pkg?.product?.identifier ?? '(no id)';
          const packageType = pkg?.packageType ?? '(no type)';
          const price = pkg?.product?.priceString ?? '(no price)';
          const mappedPlan = RC_PRODUCT_TO_PLAN[productId] ?? 'UNMAPPED';
          log(`[RC]   pkg[${idx}]: ${productId} | type=${packageType} | price=${price} | →${mappedPlan}`);
        });

        if (allPkgs.length > 0) {
          const unmapped = allPkgs.filter((pkg: any) => !RC_PRODUCT_TO_PLAN[pkg.product.identifier]);
          if (unmapped.length > 0) {
            log(`[RC] ⚠ ${unmapped.length} UNMAPPED: ${unmapped.map((p: any) => p.product.identifier).join(', ')}`);
          }

          const mapped: RCPackage[] = allPkgs
            .filter((pkg: any) => RC_PRODUCT_TO_PLAN[pkg.product.identifier])
            .map((pkg: any) => ({
              identifier: pkg.identifier,
              productId: pkg.product.identifier,
              priceString: pkg.product.priceString,
              period: pkg.packageType === 'ANNUAL' ? 'Yearly' : 'Monthly',
              planId: RC_PRODUCT_TO_PLAN[pkg.product.identifier],
            }));

          log(`[RC] ✓ Mapped ${mapped.length} packages: ${mapped.map((item) => `${item.productId}→${item.planId}`).join(', ')}`);
          setOfferings(mapped);

          if (mapped.length === 0) {
            log('[RC] ⚠ All packages filtered out — check RC_PRODUCT_TO_PLAN mapping');
          }
        } else {
          log('[RC] ⚠ 0 packages. Check RevenueCat dashboard: products attached to "current" offering?');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setIsAvailable(false);
        setPurchases(null);
        setOfferings([]);
        log(`[RC] ❌ Init error: ${errMsg}`);
        if (errMsg.includes('Web not supported in this plugin')) {
          log(
            `[RC] Exact cause: the RevenueCat Capacitor plugin is running its WEB implementation. shellPlatform=${getPlatform()}, runtimePlatform=${getCapacitorRuntimePlatform()}, runtimeNative=${isCapacitorNativeRuntime()}.`
          );
        }
        if (errMsg.includes('Web') || errMsg.includes('not implemented')) {
          log('[RC] This confirms the native RevenueCat implementation is unavailable in the current runtime.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, retryTrigger, log, purchases]);

  const purchasePackage = useCallback(async (packageId: string) => {
    if (!purchases) throw new Error('RevenueCat not available');
    const { Purchases } = await import('@revenuecat/purchases-capacitor');

    const rcOfferings = await Purchases.getOfferings();
    const pkg = (rcOfferings as any)?.current?.availablePackages?.find(
      (item: any) => item.identifier === packageId
    );
    if (!pkg) throw new Error(`Package "${packageId}" not found`);

    await Purchases.purchasePackage({ aPackage: pkg });
    // The webhook will update plan_overrides server-side
  }, [purchases]);

  const restorePurchases = useCallback(async () => {
    if (!purchases) throw new Error('RevenueCat not available');
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.restorePurchases();
  }, [purchases]);

  const diagnostics = getDiagnostics();

  if (!isNativeApp()) {
    return {
      isAvailable: false,
      offerings: [],
      isLoading: false,
      purchasePackage: async () => {
        throw new Error('Not available on web');
      },
      restorePurchases: async () => {
        throw new Error('Not available on web');
      },
      retryInit: () => {},
      debugLog,
      diagnostics,
    };
  }

  return {
    isAvailable,
    offerings,
    isLoading,
    purchasePackage,
    restorePurchases,
    retryInit,
    debugLog,
    diagnostics,
  };
}
