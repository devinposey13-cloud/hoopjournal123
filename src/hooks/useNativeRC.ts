/**
 * useNativeRC — RevenueCat initialization and readiness check for Despia native.
 *
 * Probes the native RC bridge on mount via `getpurchasehistory://` to confirm
 * that RevenueCat is configured and reachable. Exposes a `ready` flag so the
 * paywall can gate rendering until RC is available.
 *
 * Also fetches and exposes offerings/packages for live pricing display.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isDespia, isDespiaIOS, isDespiaAndroid, getPlatform } from '@/lib/platform';

export interface RCPackageInfo {
  identifier: string;
  productId: string;
  priceString: string;
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
  /** Parsed packages from RC offerings */
  packages: RCPackageInfo[];
  /** Helper: find a package by product ID substring match */
  findPackage: (productIdSubstring: string) => RCPackageInfo | undefined;
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
        
        console.log(`[NativeRC] Package ${pkg.identifier} (${productId}): ${priceString}`);
        
        return {
          identifier: pkg.identifier,
          productId,
          priceString,
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

    if (!native) {
      setDiagnostics((prev) => ({
        ...prev,
        rc_platform_detected: platform,
        rc_native_available: false,
        rc_bridge_reachable: false,
        rc_products_loaded: true,
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

      // Fetch offerings and parse packages
      let parsedPackages: RCPackageInfo[] = [];
      try {
        console.log('[NativeRC] Fetching offerings via revenuecat://getOfferings…');
        const offeringsData = await despia('revenuecat://getOfferings', ['offerings']);
        parsedPackages = parsePackages(offeringsData);
        console.log(`[NativeRC] Parsed ${parsedPackages.length} packages from offerings`);
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

      probeAttemptRef.current += 1;
      if (probeAttemptRef.current <= MAX_AUTO_RETRIES) {
        console.log(`[NativeRC] Auto-retry ${probeAttemptRef.current}/${MAX_AUTO_RETRIES} in ${RETRY_DELAY_MS}ms…`);
        setTimeout(() => probe(), RETRY_DELAY_MS);
        return;
      }

      setReady(false);
    } finally {
      setLoading(false);
    }
  }, [getDespia, parsePackages]);

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

  return { ready, loading, diagnostics, retry, retryCount, packages, findPackage };
}
