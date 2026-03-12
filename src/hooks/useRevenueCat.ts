/**
 * RevenueCat integration hook for native (Capacitor) in-app purchases.
 *
 * On web this hook is a no-op — all purchase flows go through Stripe.
 * On native, it initialises the RevenueCat SDK, identifies the user,
 * and exposes purchase / restore helpers.
 */

import { useState, useEffect, useCallback } from 'react';
import { isNativeApp } from '@/lib/platform';
import { useAuth } from '@/hooks/useAuth';
import type { PlanId } from '@/lib/plans';

// RevenueCat publishable iOS API key — safe to embed in client code
const REVENUECAT_IOS_API_KEY = 'appl_REPLACE_WITH_YOUR_KEY';

// Map RevenueCat product identifiers → internal plan IDs
export const RC_PRODUCT_TO_PLAN: Record<string, PlanId> = {
  hj_starter_monthly: 'starter',
  hj_starter_yearly: 'starter',
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

  // Initialise SDK on native only
  useEffect(() => {
    if (!isNativeApp()) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import so the Capacitor plugin isn't bundled on web
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        if (cancelled) return;

        await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
        setPurchases(Purchases);
        setIsAvailable(true);

        // Identify user if logged in
        if (user?.id) {
          await Purchases.logIn({ appUserID: user.id });
        }

        // Fetch offerings
        setIsLoading(true);
        const rcOfferings = await Purchases.getOfferings();
        const current = (rcOfferings as any)?.current;
        if (current?.availablePackages) {
          const mapped: RCPackage[] = current.availablePackages
            .filter((pkg: any) => RC_PRODUCT_TO_PLAN[pkg.product.identifier])
            .map((pkg: any) => ({
              identifier: pkg.identifier,
              productId: pkg.product.identifier,
              priceString: pkg.product.priceString,
              period: pkg.packageType === 'ANNUAL' ? 'Yearly' : 'Monthly',
              planId: RC_PRODUCT_TO_PLAN[pkg.product.identifier],
            }));
          setOfferings(mapped);
        }
      } catch (err) {
        console.error('[RevenueCat] Init error:', err);
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
    const pkg = rcOfferings?.current?.availablePackages?.find(
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
    };
  }

  return { isAvailable, offerings, isLoading, purchasePackage, restorePurchases };
}
