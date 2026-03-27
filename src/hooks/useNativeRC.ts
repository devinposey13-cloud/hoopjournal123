/**
 * useNativeRC — RevenueCat initialization and readiness check for Despia native.
 *
 * Probes the native RC bridge on mount via `getpurchasehistory://` to confirm
 * that RevenueCat is configured and reachable. Exposes a `ready` flag so the
 * paywall can gate rendering until RC is available.
 *
 * Also fetches and exposes offerings/packages with intro price metadata so
 * paywall surfaces can display real trial information from Apple.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isDespia, isDespiaIOS, isDespiaAndroid, getPlatform } from '@/lib/platform';

export interface RCPackageInfo {
  identifier: string;
  productId: string;
  priceString: string;
  /** If non-null, this product has an introductory offer (free trial, intro price, etc.) */
  introPrice: {
    priceString: string;
    price: number;
    period: string;
    periodUnit: string;
    cycles: number;
  } | null;
}

export interface NativeRCDiagnostics {
  rc_platform_detected: string;
  rc_native_available: boolean;
  rc_bridge_reachable: boolean;
  rc_offerings_count: number;
  rc_products_loaded: boolean;
  rc_entitlements_found: number;
  rc_error: string | null;
}

export interface UseNativeRCReturn {
  /** True once the native RC bridge has responded successfully */
  ready: boolean;
  /** True while the init probe is in flight */
  loading: boolean;
  /** Diagnostics for debug panel */
  diagnostics: NativeRCDiagnostics;
  /** Retry the init probe */
  retry: () => void;
  /** Number of retry attempts */
  retryCount: number;
  /** Parsed packages from RC offerings with intro price metadata */
  packages: RCPackageInfo[];
  /** Helper: find a package by product ID substring match */
  findPackage: (productIdSubstring: string) => RCPackageInfo | undefined;
  /** Helper: check if a product has a free trial */
  hasTrialForProduct: (productIdSubstring: string) => boolean;
  /** Helper: get trial copy for a product, e.g. "3-day free trial, then $4.99/mo" */
  getTrialCopyForProduct: (productIdSubstring: string) => string | null;
}

const MAX_AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

export function useNativeRC(): UseNativeRCReturn {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [packages, setPackages] = useState<RCPackageInfo[]>([]);
  const [diagnostics, setDiagnostics] = useState<NativeRCDiagnostics>({
    rc_platform_detected: getPlatform(),
    rc_native_available: isDespia(),
    rc_bridge_reachable: false,
    rc_offerings_count: 0,
    rc_products_loaded: false,
    rc_entitlements_found: 0,
    rc_error: null,
  });
  const despiaRef = useRef<any>(null);
  const probeAttemptRef = useRef(0);

  const getDespia = useCallback(async () => {
    if (despiaRef.current) return despiaRef.current;
    const mod = await import('despia-native');
    despiaRef.current = mod.default || mod;
    return despiaRef.current;
  }, []);

  const parsePackages = useCallback((offeringsData: any): RCPackageInfo[] => {
    try {
      const offerings = offeringsData?.offerings;
      if (!offerings) return [];
      const current = offerings.current || offerings.default;
      if (!current) return [];
      const pkgs = current.availablePackages ?? [];
      
      return pkgs.map((pkg: any) => {
        const product = pkg.product || pkg;
        const productId = product?.identifier || pkg.productIdentifier || pkg.identifier || '';
        const priceString = product?.priceString || pkg.priceString || '';
        
        // Parse introductory price / free trial
        const intro = product?.introductoryPrice || product?.introPrice || null;
        let introPrice: RCPackageInfo['introPrice'] = null;
        
        if (intro) {
          const introPriceVal = parseFloat(intro.price ?? intro.priceString?.replace(/[^0-9.]/g, '') ?? '0');
          introPrice = {
            priceString: intro.priceString ?? (introPriceVal === 0 ? 'Free' : `$${introPriceVal}`),
            price: introPriceVal,
            period: intro.subscriptionPeriod ?? intro.period ?? '',
            periodUnit: intro.periodUnit ?? intro.subscriptionPeriod?.unit ?? 'day',
            cycles: intro.numberOfPeriods ?? intro.cycles ?? 1,
          };
          
          console.log(`[NativeRC] Package ${pkg.identifier} (${productId}): HAS intro price — ${introPrice.priceString}, period=${introPrice.period}, unit=${introPrice.periodUnit}, cycles=${introPrice.cycles}`);
        } else {
          console.log(`[NativeRC] Package ${pkg.identifier} (${productId}): NO intro price`);
        }
        
        return {
          identifier: pkg.identifier,
          productId,
          priceString,
          introPrice,
        };
      });
    } catch (err) {
      console.error('[NativeRC] Failed to parse packages:', err);
      return [];
    }
  }, []);

  const probe = useCallback(async () => {
    const platform = getPlatform();
    const native = isDespia();

    console.log(`[NativeRC] rc_platform_detected: ${platform}`);
    console.log(`[NativeRC] rc_native_available: ${native}`);
    console.log(`[NativeRC] isDespiaIOS: ${isDespiaIOS()}, isDespiaAndroid: ${isDespiaAndroid()}`);

    if (!native) {
      // Web — no RC needed, mark ready immediately
      setDiagnostics((prev) => ({
        ...prev,
        rc_platform_detected: platform,
        rc_native_available: false,
        rc_bridge_reachable: false,
        rc_products_loaded: true, // web uses Stripe
      }));
      setReady(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const despia = await getDespia();
      console.log('[NativeRC] Probing RC bridge via getpurchasehistory://…');

      const data = await despia('getpurchasehistory://', ['restoredData']);
      const purchases = data?.restoredData ?? [];
      const active = purchases.filter((p: any) => p.isActive);

      console.log(`[NativeRC] rc_bridge_reachable: true`);
      console.log(`[NativeRC] rc_entitlements_found: ${active.length}`);
      console.log(`[NativeRC] rc_products_loaded: true`);

      // Fetch offerings and parse packages
      let parsedPackages: RCPackageInfo[] = [];
      try {
        console.log('[NativeRC] Fetching offerings via revenuecat://getOfferings…');
        const offeringsData = await despia('revenuecat://getOfferings', ['offerings']);
        parsedPackages = parsePackages(offeringsData);
        console.log(`[NativeRC] Parsed ${parsedPackages.length} packages from offerings`);
        
        // Log summary
        parsedPackages.forEach((pkg) => {
          const trialInfo = pkg.introPrice 
            ? `TRIAL: ${pkg.introPrice.priceString} for ${pkg.introPrice.period || pkg.introPrice.cycles + ' ' + pkg.introPrice.periodUnit}` 
            : 'NO TRIAL';
          console.log(`[NativeRC] Summary: ${pkg.identifier} → ${pkg.productId} @ ${pkg.priceString} | ${trialInfo}`);
        });
      } catch (offerErr) {
        console.log(`[NativeRC] getOfferings not available: ${offerErr instanceof Error ? offerErr.message : offerErr}`);
      }

      setPackages(parsedPackages);
      setDiagnostics({
        rc_platform_detected: platform,
        rc_native_available: true,
        rc_bridge_reachable: true,
        rc_offerings_count: parsedPackages.length,
        rc_products_loaded: true,
        rc_entitlements_found: active.length,
        rc_error: null,
      });
      setReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[NativeRC] rc_bridge_reachable: false — ${msg}`);

      setDiagnostics((prev) => ({
        ...prev,
        rc_platform_detected: platform,
        rc_native_available: true,
        rc_bridge_reachable: false,
        rc_products_loaded: false,
        rc_error: msg,
      }));

      // Auto-retry
      probeAttemptRef.current += 1;
      if (probeAttemptRef.current <= MAX_AUTO_RETRIES) {
        console.log(`[NativeRC] Auto-retry ${probeAttemptRef.current}/${MAX_AUTO_RETRIES} in ${RETRY_DELAY_MS}ms…`);
        setTimeout(() => probe(), RETRY_DELAY_MS);
        return; // stay in loading state
      }

      // All retries exhausted — still mark as "ready" so UI shows fallback
      setReady(false);
    } finally {
      setLoading(false);
    }
  }, [getDespia, parsePackages]);

  // Probe on mount
  useEffect(() => {
    probe();
  }, [probe]);

  const retry = useCallback(() => {
    probeAttemptRef.current = 0;
    setRetryCount((c) => c + 1);
    setReady(false);
    probe();
  }, [probe]);

  const findPackage = useCallback((productIdSubstring: string): RCPackageInfo | undefined => {
    return packages.find((p) =>
      p.productId.toLowerCase().includes(productIdSubstring.toLowerCase()) ||
      p.identifier.toLowerCase().includes(productIdSubstring.toLowerCase())
    );
  }, [packages]);

  const hasTrialForProduct = useCallback((productIdSubstring: string): boolean => {
    const pkg = findPackage(productIdSubstring);
    return !!(pkg?.introPrice && pkg.introPrice.price === 0);
  }, [findPackage]);

  const getTrialCopyForProduct = useCallback((productIdSubstring: string): string | null => {
    const pkg = findPackage(productIdSubstring);
    if (!pkg?.introPrice || pkg.introPrice.price !== 0) return null;
    
    // Build human-readable trial copy
    const period = pkg.introPrice.period || `${pkg.introPrice.cycles} ${pkg.introPrice.periodUnit}`;
    // Try to extract number of days
    let trialDuration = period;
    if (pkg.introPrice.periodUnit?.toLowerCase().includes('day')) {
      trialDuration = `${pkg.introPrice.cycles}-day`;
    } else if (period.includes('P3D') || period.includes('3D')) {
      trialDuration = '3-day';
    } else if (period.includes('P7D') || period.includes('7D') || period.includes('1W')) {
      trialDuration = '7-day';
    }
    
    return `${trialDuration} free trial, then ${pkg.priceString}`;
  }, [findPackage]);

  return { ready, loading, diagnostics, retry, retryCount, packages, findPackage, hasTrialForProduct, getTrialCopyForProduct };
}
