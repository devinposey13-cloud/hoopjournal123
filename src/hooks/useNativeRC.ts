/**
 * useNativeRC — RevenueCat initialization and readiness check for Despia native.
 *
 * Probes the native RC bridge on mount via `getpurchasehistory://` to confirm
 * that RevenueCat is configured and reachable. Exposes a `ready` flag so the
 * paywall can gate rendering until RC is available.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isDespia, isDespiaIOS, isDespiaAndroid, getPlatform } from '@/lib/platform';

export interface NativeRCDiagnostics {
  rc_platform_detected: string;
  rc_native_available: boolean;
  rc_bridge_reachable: boolean;
  rc_offerings_count: number; // Always 0 — Despia doesn't expose offerings via JS
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
}

const MAX_AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

export function useNativeRC(): UseNativeRCReturn {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
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

      setDiagnostics({
        rc_platform_detected: platform,
        rc_native_available: true,
        rc_bridge_reachable: true,
        rc_offerings_count: 0, // Despia manages offerings natively
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
  }, [getDespia]);

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

  return { ready, loading, diagnostics, retry, retryCount };
}
