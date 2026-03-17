/**
 * RevenueCat integration hook for native (Capacitor) in-app purchases.
 *
 * On web this hook is a no-op — all purchase flows go through Stripe.
 * On native, it initialises the RevenueCat SDK, identifies the user,
 * and exposes purchase / restore helpers.
 */

import { useState, useEffect, useCallback } from 'react';
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

  const log = (msg: string) => {
    console.log(msg);
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  };

  // Initialise SDK on native only
  useEffect(() => {
    const native = isNativeApp();
    log(`[RC] isNativeApp: ${native}, platform: ${getPlatform()}, webkit: ${!!(window as any).webkit?.messageHandlers}`);
    if (!native) {
      log('[RC] Skipping init — not native');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        log('[RC] Importing purchases-capacitor…');
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        if (cancelled) return;
        log('[RC] Imported OK');

        // Wait for native bridge to be available (handles remote-URL race condition)
        const MAX_RETRIES = 6;
        const RETRY_DELAY = 500;
        let bridgeReady = false;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          const available = Capacitor.isPluginAvailable('PurchasesPlugin');
          log(`[RC] Bridge check attempt ${attempt + 1}/${MAX_RETRIES}: ${available ? '✓ available' : '✗ not yet'}`);
          if (available) {
            bridgeReady = true;
            break;
          }
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
          }
        }

        if (!bridgeReady) {
          log('[RC] ❌ Native bridge never became available after retries. Plugin may not be compiled into the binary.');
          return;
        }

        if (cancelled) return;
        log('[RC] Bridge ready, configuring…');

        await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
        log('[RC] Configured ✓');
        setPurchases(Purchases);
        setIsAvailable(true);

        // Identify user if logged in
        if (user?.id) {
          log(`[RC] Logging in user: ${user.id}`);
          await Purchases.logIn({ appUserID: user.id });
          log('[RC] User logged in ✓');
        }

        // Fetch offerings
        setIsLoading(true);
        log('[RC] Fetching offerings…');
        const rcOfferings = await Purchases.getOfferings();
        const current = (rcOfferings as any)?.current;
        const allPkgs = current?.availablePackages ?? [];
        log(`[RC] Offerings response: current=${!!current}, availablePackages=${allPkgs.length}`);
        
        // Log every raw package for debugging
        allPkgs.forEach((pkg: any, idx: number) => {
          const prodId = pkg?.product?.identifier ?? '(no identifier)';
          const pkgType = pkg?.packageType ?? '(no type)';
          const price = pkg?.product?.priceString ?? '(no price)';
          const mapped = RC_PRODUCT_TO_PLAN[prodId] ?? 'UNMAPPED';
          log(`[RC]   pkg[${idx}]: ${prodId} | type=${pkgType} | price=${price} | maps→${mapped}`);
        });

        if (allPkgs.length > 0) {
          const unmapped = allPkgs.filter((pkg: any) => !RC_PRODUCT_TO_PLAN[pkg.product.identifier]);
          if (unmapped.length > 0) {
            log(`[RC] ⚠ ${unmapped.length} packages have NO mapping in RC_PRODUCT_TO_PLAN: ${unmapped.map((p: any) => p.product.identifier).join(', ')}`);
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
            log('[RC] ⚠ All packages were filtered out — check RC_PRODUCT_TO_PLAN mapping');
          }
        } else {
          log('[RC] ⚠ No current offering or no available packages. Check RevenueCat dashboard: are products attached to the "current" offering?');
        }
      } catch (err) {
        log(`[RC] ❌ Init error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

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
      debugLog,
    };
  }

  return { isAvailable, offerings, isLoading, purchasePackage, restorePurchases, debugLog };
}
