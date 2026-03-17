/**
 * RevenueCat integration hook for native (Capacitor) in-app purchases.
 *
 * On web this hook is a no-op — all purchase flows go through Stripe.
 * On native, it lazily loads @revenuecat/purchases-capacitor, waits for the
 * Capacitor runtime to actually be native, and exposes purchase / restore helpers.
 *
 * KEY DIAGNOSTIC: If shellNative=true but the Purchases plugin resolves to the
 * web stub, the native iOS framework was NOT bundled into the binary. The fix
 * is: `npx cap sync ios && cd ios/App && pod install`, then rebuild in Xcode.
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
  HoopJ_pro_monthly: 'pro',
  HoopJ_pro_yearly: 'pro',
  HoopJ_elite_monthly: 'elite',
  HoopJ_elite_yearly: 'elite',
};

export interface RCPackage {
  identifier: string;
  productId: string;
  priceString: string;
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
 * Detect whether the dynamically-imported Purchases module is backed by
 * the real native Capacitor plugin or the web stub.
 *
 * The web stub's configure() immediately throws "Web not supported in this plugin".
 * Native implementations have an underlying bridge registered in the Capacitor
 * plugin registry under "PurchasesPlugin" or "Purchases".
 */
function detectPurchasesImplementation(PurchasesObj: any): 'native' | 'web' | 'unknown' {
  try {
    // Check 1: Capacitor plugin registry — the native plugin registers itself
    const pluginAvailable = Capacitor.isPluginAvailable('Purchases');
    if (pluginAvailable) return 'native';

    // Check 2: If the plugin object has a _pluginInstance or bridge reference, it's native
    if (PurchasesObj?._pluginInstance) return 'native';

    // Check 3: Inspect the prototype for web-stub markers
    // The web implementation typically has methods that throw "not supported"
    // We can't call them, but if the plugin isn't in the registry, it's web
    if (!pluginAvailable) return 'web';
  } catch {
    // fall through
  }
  return 'unknown';
}

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
        setStatusReason(null);

        // ─── Step 1: Wait for the Capacitor bridge to register the plugin ───
        const MAX_BRIDGE_RETRIES = 10;
        const RETRY_DELAY = 500;

        log('[RC] Waiting for Capacitor bridge to register Purchases plugin…');

        let pluginRegistered = false;
        for (let i = 0; i < MAX_BRIDGE_RETRIES; i++) {
          if (cancelled) return;

          const available = Capacitor.isPluginAvailable('Purchases');
          const rp = getCapacitorRuntimePlatform();
          const rn = isCapacitorNativeRuntime();

          log(
            `[RC] Bridge poll ${i + 1}/${MAX_BRIDGE_RETRIES}: pluginAvailable=${available}, runtimePlatform=${rp}, runtimeNative=${rn}`
          );

          if (available) {
            pluginRegistered = true;
            break;
          }

          if (i < MAX_BRIDGE_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
          }
        }

        // ─── Step 2: If plugin never registered, it's not in the binary ───
        if (!pluginRegistered) {
          log(
            `[RC] ❌ Capacitor.isPluginAvailable('Purchases') = false after ${MAX_BRIDGE_RETRIES} attempts.`
          );
          log(
            '[RC] DIAGNOSIS: The native RevenueCat iOS framework is NOT present in this binary. ' +
            'The @revenuecat/purchases-capacitor npm package is installed, but the native iOS ' +
            'CocoaPod (PurchasesHybridCommon) was not bundled. This means `npx cap sync ios` ' +
            'and/or `cd ios/App && pod install` was not run before building the IPA.'
          );
          setStatusReason('native_plugin_missing_in_build');
          return;
        }

        // ─── Step 3: Dynamic import & native-vs-web detection ───
        log('[RC] Plugin registered ✓. Importing @revenuecat/purchases-capacitor…');
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        if (cancelled) return;
        log('[RC] Import OK');

        const implType = detectPurchasesImplementation(Purchases);
        log(`[RC] Purchases implementation type: ${implType}`);

        if (implType === 'web') {
          log(
            '[RC] ❌ IMPORTED WEB IMPLEMENTATION IN NATIVE SHELL. ' +
            'The dynamic import of @revenuecat/purchases-capacitor resolved to the web stub ' +
            'instead of the native Capacitor bridge. This happens when the Vite bundler resolves ' +
            'the package to its web entry point because the native plugin is not in the binary. ' +
            'FIX: run `npx cap sync ios && cd ios/App && pod install`, then rebuild in Xcode.'
          );
          setStatusReason('imported_web_impl_in_native_shell');
          return;
        }

        // ─── Step 4: Configure ───
        log('[RC] Attempting Purchases.configure()…');
        try {
          await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
          log('[RC] configure() success ✓');
        } catch (configErr: any) {
          const msg = configErr?.message ?? String(configErr);
          const stack = configErr?.stack ?? '(no stack)';
          log(`[RC] configure() threw: "${msg}"`);
          log(`[RC] configure() stack: ${stack}`);

          if (msg.includes('already configured') || msg.includes('Already configured')) {
            log('[RC] Already configured (expected) ✓');
          } else if (msg.includes('Web not supported') || msg.includes('not implemented') || msg.includes('Unimplemented')) {
            log(
              '[RC] ❌ configure() hit web implementation despite plugin registry claiming availability. ' +
              `shellPlatform=${diagnostics.shellPlatform}, runtimePlatform=${getCapacitorRuntimePlatform()}, ` +
              `runtimeNative=${isCapacitorNativeRuntime()}.`
            );
            setStatusReason('configure_failed_web_impl');
            return;
          } else {
            log(`[RC] ❌ configure() unexpected error: ${msg}`);
            setStatusReason('configure_failed');
            return;
          }
        }

        if (cancelled) return;
        setPurchases(Purchases);
        setIsAvailable(true);
        setStatusReason(null);

        // ─── Step 5: Log in user ───
        if (user?.id) {
          log(`[RC] Logging in user: ${user.id.slice(0, 8)}…`);
          try {
            await Purchases.logIn({ appUserID: user.id });
            log('[RC] User logged in ✓');
          } catch (loginErr: any) {
            log(`[RC] ⚠ Login error (non-fatal): ${loginErr?.message ?? String(loginErr)}`);
          }
        }

        // ─── Step 6: Fetch offerings ───
        log('[RC] getOfferings() start…');
        const rcOfferings = await Purchases.getOfferings();
        log('[RC] getOfferings() success ✓');

        const current = (rcOfferings as any)?.current;
        const allPkgs = current?.availablePackages ?? [];
        log(`[RC] Offerings: current=${!!current}, packages=${allPkgs.length}`);

        if (allPkgs.length === 0) {
          setStatusReason('offerings_empty');
          log(`[RC] Raw offerings keys: ${Object.keys(rcOfferings || {}).join(', ')}`);
          const allOfferings = (rcOfferings as any)?.all;
          if (allOfferings) {
            const keys = Object.keys(allOfferings);
            log(`[RC] All offerings: ${keys.join(', ')} (${keys.length} total)`);
            keys.forEach((key) => {
              const pkgCount = allOfferings[key]?.availablePackages?.length ?? 0;
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
          const mapped: RCPackage[] = allPkgs
            .filter((pkg: any) => RC_PRODUCT_TO_PLAN[pkg.product.identifier])
            .map((pkg: any) => ({
              identifier: pkg.identifier,
              productId: pkg.product.identifier,
              priceString: pkg.product.priceString,
              period: pkg.packageType === 'ANNUAL' ? 'Yearly' : 'Monthly',
              planId: RC_PRODUCT_TO_PLAN[pkg.product.identifier],
            }));

          log(`[RC] ✓ Mapped ${mapped.length} packages`);
          setOfferings(mapped);

          if (mapped.length === 0) {
            setStatusReason('offering_mapping_mismatch');
            log('[RC] ⚠ All packages filtered out — check RC_PRODUCT_TO_PLAN mapping');
          }
        }
      } catch (err: any) {
        const errMsg = err?.message ?? String(err);
        const stack = err?.stack ?? '(no stack)';
        setIsAvailable(false);
        setPurchases(null);
        setOfferings([]);
        log(`[RC] ❌ Init error: ${errMsg}`);
        log(`[RC] ❌ Stack: ${stack}`);

        if (errMsg.includes('Web not supported') || errMsg.includes('not implemented') || errMsg.includes('Unimplemented')) {
          setStatusReason('configure_failed_web_impl');
          log(
            `[RC] Root cause: RevenueCat resolved to WEB implementation. ` +
            `shellPlatform=${getPlatform()}, runtimePlatform=${getCapacitorRuntimePlatform()}, runtimeNative=${isCapacitorNativeRuntime()}.`
          );
        } else {
          setStatusReason('init_error');
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
      purchasePackage: async () => { throw new Error('Not available on web'); },
      restorePurchases: async () => { throw new Error('Not available on web'); },
      retryInit: () => {},
      debugLog,
      diagnostics,
      statusReason: 'web_environment',
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
    statusReason,
  };
}
