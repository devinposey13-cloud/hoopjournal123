/**
 * RevenueCat integration hook for native (Capacitor) in-app purchases.
 *
 * On web this hook is a no-op — all purchase flows go through Stripe.
 * On native, it initialises the RevenueCat SDK, identifies the user,
 * and exposes purchase / restore helpers.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { isNativeApp, getPlatform } from '@/lib/platform';
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

export interface UseRevenueCatReturn {
  isAvailable: boolean;
  offerings: RCPackage[];
  isLoading: boolean;
  purchasePackage: (packageId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  retryInit: () => void;
  debugLog: string[];
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
  const initAttemptRef = useRef(0);

  const log = useCallback((msg: string) => {
    console.log(msg);
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  }, []);

  const retryInit = useCallback(() => {
    log('[RC] Manual retry triggered');
    setRetryTrigger((v) => v + 1);
  }, [log]);

  // Initialise SDK on native only
  useEffect(() => {
    const native = isNativeApp();
    const platform = getPlatform();
    const attempt = ++initAttemptRef.current;
    log(`[RC] Init attempt #${attempt} | native: ${native}, platform: ${platform}, webkit: ${!!(window as any).webkit?.messageHandlers}`);

    if (!native) {
      log('[RC] Skipping init — not native');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        log('[RC] Importing purchases-capacitor…');
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        if (cancelled) return;
        log('[RC] Import OK');

        // Wait for native bridge to be available (handles remote-URL race condition)
        // CRITICAL: The plugin registers as 'Purchases' (not 'PurchasesPlugin')
        // See: https://github.com/RevenueCat/purchases-capacitor/blob/main/src/index.ts
        const PLUGIN_NAME = 'Purchases';
        const MAX_RETRIES = 8;
        const RETRY_DELAY = 600;
        let bridgeReady = false;

        for (let i = 0; i < MAX_RETRIES; i++) {
          if (cancelled) return;
          const available = Capacitor.isPluginAvailable(PLUGIN_NAME);
          log(`[RC] Bridge check ${i + 1}/${MAX_RETRIES} for '${PLUGIN_NAME}': ${available ? '✓ available' : '✗ not yet'}`);
          if (available) {
            bridgeReady = true;
            break;
          }
          if (i < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
          }
        }

        if (!bridgeReady) {
          // Also try calling configure directly — some Capacitor versions
          // don't register the plugin in the registry but the native bridge works
          log('[RC] Bridge not in registry. Attempting direct configure() as fallback…');
          try {
            await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
            log('[RC] Direct configure() succeeded despite registry miss ✓');
            bridgeReady = true;
          } catch (directErr) {
            const errMsg = directErr instanceof Error ? directErr.message : String(directErr);
            log(`[RC] ❌ Direct configure() also failed: ${errMsg}`);
            if (errMsg.includes('Web') || errMsg.includes('not implemented') || errMsg.includes('Unimplemented')) {
              log('[RC] ❌ CONFIRMED: Native plugin not compiled into binary. Run: npx cap sync ios && cd ios/App && pod install && rebuild.');
            }
            return;
          }
        }

        if (cancelled) return;

        // Configure if we haven't already (direct fallback path does it above)
        if (bridgeReady && !purchases) {
          try {
            log('[RC] Configuring with API key…');
            await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
            log('[RC] Configured ✓');
          } catch (configErr) {
            // "Already configured" is fine — means configure() was called by the fallback
            const msg = configErr instanceof Error ? configErr.message : String(configErr);
            if (msg.includes('already configured') || msg.includes('Already configured')) {
              log('[RC] Already configured (expected) ✓');
            } else {
              log(`[RC] ❌ Configure error: ${msg}`);
              return;
            }
          }
        }

        if (cancelled) return;
        setPurchases(Purchases);
        setIsAvailable(true);

        // Identify user if logged in
        if (user?.id) {
          log(`[RC] Logging in user: ${user.id.slice(0, 8)}…`);
          try {
            await Purchases.logIn({ appUserID: user.id });
            log('[RC] User logged in ✓');
          } catch (loginErr) {
            log(`[RC] ⚠ Login error (non-fatal): ${loginErr instanceof Error ? loginErr.message : String(loginErr)}`);
          }
        }

        // Fetch offerings
        log('[RC] Fetching offerings…');
        const rcOfferings = await Purchases.getOfferings();
        const current = (rcOfferings as any)?.current;
        const allPkgs = current?.availablePackages ?? [];
        log(`[RC] Offerings: current=${!!current}, packages=${allPkgs.length}`);

        // Log raw offerings JSON for deep debugging
        if (allPkgs.length === 0) {
          log(`[RC] Raw offerings keys: ${Object.keys(rcOfferings || {}).join(', ')}`);
          const allOfferings = (rcOfferings as any)?.all;
          if (allOfferings) {
            const offeringKeys = Object.keys(allOfferings);
            log(`[RC] All offerings: ${offeringKeys.join(', ')} (${offeringKeys.length} total)`);
            offeringKeys.forEach((key) => {
              const off = allOfferings[key];
              const pkgCount = off?.availablePackages?.length ?? 0;
              log(`[RC]   offering '${key}': ${pkgCount} packages`);
            });
          }
        }

        // Log every raw package
        allPkgs.forEach((pkg: any, idx: number) => {
          const prodId = pkg?.product?.identifier ?? '(no id)';
          const pkgType = pkg?.packageType ?? '(no type)';
          const price = pkg?.product?.priceString ?? '(no price)';
          const mapped = RC_PRODUCT_TO_PLAN[prodId] ?? 'UNMAPPED';
          log(`[RC]   pkg[${idx}]: ${prodId} | type=${pkgType} | price=${price} | →${mapped}`);
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
          log(`[RC] ✓ Mapped ${mapped.length} packages: ${mapped.map(m => `${m.productId}→${m.planId}`).join(', ')}`);
          setOfferings(mapped);

          if (mapped.length === 0) {
            log('[RC] ⚠ All packages filtered out — check RC_PRODUCT_TO_PLAN mapping');
          }
        } else {
          log('[RC] ⚠ 0 packages. Check RevenueCat dashboard: products attached to "current" offering?');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log(`[RC] ❌ Init error: ${errMsg}`);
        if (errMsg.includes('Web') || errMsg.includes('not implemented')) {
          log('[RC] This confirms the native plugin is NOT in the binary.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, retryTrigger]);

  const purchasePackage = useCallback(async (packageId: string) => {
    if (!purchases) throw new Error('RevenueCat not available');
    const { Purchases } = await import('@revenuecat/purchases-capacitor');

    const rcOfferings = await Purchases.getOfferings();
    const pkg = (rcOfferings as any)?.current?.availablePackages?.find(
      (p: any) => p.identifier === packageId
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

  // Web stub
  if (!isNativeApp()) {
    return {
      isAvailable: false,
      offerings: [],
      isLoading: false,
      purchasePackage: async () => { throw new Error('Not available on web'); },
      restorePurchases: async () => { throw new Error('Not available on web'); },
      retryInit: () => {},
      debugLog,
    };
  }

  return { isAvailable, offerings, isLoading, purchasePackage, restorePurchases, retryInit, debugLog };
}
