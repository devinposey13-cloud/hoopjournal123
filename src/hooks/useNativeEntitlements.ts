/**
 * Proactive native entitlement checking via Despia + RevenueCat.
 *
 * Calls `getpurchasehistory://` on mount and exposes helpers to
 * verify entitlements before gating features or attempting purchases.
 * These checks are instant and offline-capable per Despia docs.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isDespia } from '@/lib/platform';
import { PRODUCT_TO_PLAN } from '@/hooks/useBilling';
import type { PlanId } from '@/lib/plans';

export interface NativeEntitlement {
  productId?: string;
  entitlementId?: string;
  isActive?: boolean;
  willRenew?: boolean;
  expirationDate?: string;
  store?: string;
  environment?: string;
}

export interface UseNativeEntitlementsReturn {
  /** All active entitlements from the native store */
  activeEntitlements: NativeEntitlement[];
  /** Whether the entitlement check is in progress */
  isChecking: boolean;
  /** Whether we successfully loaded entitlements at least once */
  isLoaded: boolean;
  /** Last error from the entitlement check */
  error: string | null;
  /** True if user has 'pro' entitlement */
  hasPro: boolean;
  /** True if user has 'elite' entitlement */
  hasElite: boolean;
  /** The highest active plan from native entitlements */
  activePlan: PlanId;
  /** Re-check entitlements (e.g. after purchase/restore) */
  refresh: () => Promise<void>;
}

export function useNativeEntitlements(): UseNativeEntitlementsReturn {
  const [activeEntitlements, setActiveEntitlements] = useState<NativeEntitlement[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const despiaRef = useRef<any>(null);

  const getDespia = useCallback(async () => {
    if (despiaRef.current) return despiaRef.current;
    const mod = await import('despia-native');
    despiaRef.current = mod.default || mod;
    return despiaRef.current;
  }, []);

  const checkEntitlements = useCallback(async () => {
    if (!isDespia()) {
      setIsLoaded(true);
      return;
    }

    setIsChecking(true);
    setError(null);
    console.log('[Entitlements] Checking native entitlements…');

    try {
      const despia = await getDespia();
      const data = await despia('getpurchasehistory://', ['restoredData']);
      const purchases: NativeEntitlement[] = data?.restoredData ?? [];
      const active = purchases.filter((p) => p.isActive);

      console.log(`[Entitlements] Found ${active.length} active entitlement(s)`);
      active.forEach((p, i) => {
        console.log(`[Entitlements]   [${i}] entitlementId=${p.entitlementId}, productId=${p.productId}, willRenew=${p.willRenew}, expires=${p.expirationDate}`);
      });

      setActiveEntitlements(active);
      setIsLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Entitlement check failed';
      console.error('[Entitlements] ❌ Check failed:', msg);
      setError(msg);
      setIsLoaded(true); // mark loaded even on error so UI doesn't hang
    } finally {
      setIsChecking(false);
    }
  }, [getDespia]);

  // Check on mount
  useEffect(() => {
    checkEntitlements();
  }, [checkEntitlements]);

  const hasPro = activeEntitlements.some(
    (p) => p.entitlementId === 'pro' || (p.productId && PRODUCT_TO_PLAN[p.productId] === 'pro')
  );
  const hasElite = activeEntitlements.some(
    (p) => p.entitlementId === 'elite' || (p.productId && PRODUCT_TO_PLAN[p.productId] === 'elite')
  );

  const activePlan: PlanId = hasElite ? 'elite' : hasPro ? 'pro' : 'free';

  return {
    activeEntitlements,
    isChecking,
    isLoaded,
    error,
    hasPro,
    hasElite,
    activePlan,
    refresh: checkEntitlements,
  };
}
