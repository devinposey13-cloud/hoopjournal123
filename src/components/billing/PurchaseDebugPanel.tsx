/**
 * PurchaseDebugPanel — hidden debug overlay for diagnosing native purchase flow.
 * Only visible when debug mode is active (tap "tap to debug" 5 times).
 */

import { useState, useEffect, useSyncExternalStore } from 'react';
import {
  getCurrentDebugSession,
  getAllDebugSessions,
  subscribeDebugSession,
  type DebugSession,
} from '@/lib/purchaseDebug';

function useDebugSession() {
  return useSyncExternalStore(
    subscribeDebugSession,
    () => getCurrentDebugSession(),
    () => null
  );
}

export function PurchaseDebugPanel({ visible }: { visible: boolean }) {
  const session = useDebugSession();
  const [, forceUpdate] = useState(0);

  // Re-render periodically while visible to pick up changes
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const s = session;

  return (
    <div className="fixed bottom-16 left-2 right-2 z-[9999] bg-black/95 text-green-400 text-[10px] font-mono p-3 rounded-lg max-h-[50vh] overflow-y-auto border border-green-500/30">
      <div className="text-green-300 font-bold text-xs mb-2">🔍 Purchase Debug Panel</div>

      {!s ? (
        <div className="text-yellow-400">No active debug session. Start a purchase to see diagnostics.</div>
      ) : (
        <div className="space-y-1.5">
          <Row label="Session ID" value={s.id.slice(-10)} />
          <Row label="Status" value={s.status} color={statusColor(s.status)} />
          <Row label="Platform" value={`${s.platform} (android=${s.isAndroid})`} />
          <Row label="Product" value={s.productId || '—'} />

          <Divider />
          <Row label="Callback registered" value={yn(s.callbackRegistered)} color={s.callbackRegistered ? 'text-green-400' : 'text-red-400'} />
          <Row label="Registered at" value={s.callbackRegisteredAt?.slice(11, 23) || '—'} />
          <Row label="Paywall launched" value={yn(s.paywallLaunched)} color={s.paywallLaunched ? 'text-green-400' : 'text-yellow-400'} />
          <Row label="Launched at" value={s.paywallLaunchedAt?.slice(11, 23) || '—'} />
          <Row label="Despia dispatch ms" value={s.despiaDispatchMs !== null ? `${s.despiaDispatchMs}ms` : '—'} />
          <Row label="Callback received" value={yn(s.callbackReceived)} color={s.callbackReceived ? 'text-green-400' : 'text-red-400'} />
          <Row label="Received at" value={s.callbackReceivedAt?.slice(11, 23) || '—'} />

          <Divider />
          <Row label="Entitlement checks" value={String(s.entitlementChecks.length)} />
          <Row label="Entitlement found" value={yn(s.entitlementFound)} color={s.entitlementFound ? 'text-green-400' : 'text-red-400'} />
          {s.entitlementChecks.length > 0 && (
            <div className="ml-2 space-y-0.5">
              {s.entitlementChecks.slice(-3).map((ec, i) => (
                <div key={i} className="text-gray-400">
                  [{ec.trigger}] active={ec.activePurchasesCount} ids={ec.activeEntitlementIds.join(',')||'none'}
                </div>
              ))}
            </div>
          )}

          <Divider />
          <Row label="Premium state updated" value={yn(s.premiumStateUpdated)} color={s.premiumStateUpdated ? 'text-green-400' : 'text-yellow-400'} />
          <Row label="Plan change" value={`${s.previousPlan || '—'} → ${s.newPlan || '—'}`} />
          <Row label="Update source" value={s.planUpdateSource || '—'} />
          <Row label="Timeout triggered" value={yn(s.timeoutTriggered)} color={s.timeoutTriggered ? 'text-red-400' : 'text-green-400'} />
          <Row label="Last error" value={s.lastError || 'none'} color={s.lastError ? 'text-red-400' : 'text-gray-500'} />
          <Row label="Last despia result" value={s.lastDespiaResult?.slice(0, 60) || '—'} />

          <Divider />
          <div className="text-gray-500">Lifecycle events: {s.lifecycleEvents.length}</div>
          {s.lifecycleEvents.slice(-5).map((le, i) => (
            <div key={i} className="text-gray-400 ml-2">
              {le.event} vis={le.visibilityState} pending={yn(le.purchasePending)} cb={yn(le.callbackFired)}
            </div>
          ))}

          {s.summary && (
            <>
              <Divider />
              <div className="text-yellow-300 font-bold">Summary</div>
              <Row label="Failure point" value={s.summary.lastKnownFailurePoint || 'none'} color={s.summary.lastKnownFailurePoint ? 'text-red-400' : 'text-green-400'} />
              <Row label="Total elapsed" value={`${(s.summary.totalElapsedMs / 1000).toFixed(1)}s`} />
            </>
          )}
        </div>
      )}

      <div className="text-gray-600 mt-2 text-[9px]">
        Sessions: {getAllDebugSessions().length} | Updated: {new Date().toISOString().slice(11, 19)}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}:</span>
      <span className={color || 'text-green-400'}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-green-900/50 my-1" />;
}

function yn(v: boolean) {
  return v ? '✓ yes' : '✗ no';
}

function statusColor(status: string): string {
  if (status === 'confirmed') return 'text-green-400';
  if (status === 'error' || status === 'callback_missing') return 'text-red-400';
  if (status.includes('waiting') || status === 'launching') return 'text-yellow-400';
  return 'text-orange-400';
}
