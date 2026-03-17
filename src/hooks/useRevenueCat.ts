/**
 * DEPRECATED — This file now re-exports from useBilling for backward compatibility.
 * All Capacitor / @revenuecat/purchases-capacitor logic has been removed.
 * Use useBilling directly for new code.
 */

import { useBilling, type BillingDiagnostics } from '@/hooks/useBilling';
import type { PlanId } from '@/lib/plans';

// Keep the old type exports for any code that still references them
export interface RCPackage {
  identifier: string;
  productId: string;
  priceString: string;
  period: string;
  planId: PlanId;
}

export const RC_PRODUCT_TO_PLAN = {
  HoopJ_pro_monthly: 'pro' as PlanId,
  HoopJ_pro_yearly: 'pro' as PlanId,
  HoopJ_elite_monthly: 'elite' as PlanId,
  HoopJ_elite_yearly: 'elite' as PlanId,
};

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

/**
 * @deprecated Use useBilling() instead. This shim adapts the old interface.
 */
export function useRevenueCat(): UseRevenueCatReturn {
  const billing = useBilling();

  // Map new diagnostics to old shape
  const diagnostics: RevenueCatDiagnostics = {
    shellPlatform: billing.diagnostics.platform,
    runtimePlatform: billing.diagnostics.platform,
    shellNative: billing.isNative,
    runtimeNative: billing.isNative,
    webkitDetected: false,
  };

  return {
    // Native is always "available" now — purchase routing is internal
    isAvailable: billing.isNative,
    offerings: [], // Despia doesn't expose offerings client-side
    isLoading: false,
    purchasePackage: async () => {
      throw new Error('Use useBilling().purchasePlan() instead');
    },
    restorePurchases: async () => {
      await billing.restorePurchases();
    },
    retryInit: () => {
      // No-op — Despia doesn't need initialization
    },
    debugLog: billing.debugLog,
    diagnostics,
    statusReason: billing.isNative ? null : 'web_environment',
  };
}
