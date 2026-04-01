/**
 * Purchase Debug Session — structured instrumentation for diagnosing
 * Despia + RevenueCat native purchase flow failures.
 *
 * Hidden behind a debug flag; normal users never see it.
 */

import { isDespia, isDespiaIOS, isDespiaAndroid, isWeb, getPlatform } from '@/lib/platform';

// ─── Types ────────────────────────────────────────────────────────────

export interface DebugSession {
  id: string;
  startedAt: string;
  platform: string;
  isNative: boolean;
  isAndroid: boolean;
  isDespia: boolean;
  userId: string | null;
  offeringId: string | null;
  productId: string | null;
  route: string;
  appVersion: string;
  // Flow state
  callbackRegistered: boolean;
  callbackRegisteredAt: string | null;
  paywallLaunched: boolean;
  paywallLaunchedAt: string | null;
  despiaDispatchMs: number | null;
  despiaResult: string | null;
  callbackReceived: boolean;
  callbackReceivedAt: string | null;
  callbackPayload: any;
  entitlementChecks: EntitlementCheckResult[];
  entitlementFound: boolean;
  premiumStateUpdated: boolean;
  previousPlan: string | null;
  newPlan: string | null;
  planUpdateSource: string | null;
  timeoutTriggered: boolean;
  lastError: string | null;
  lastDespiaResult: string | null;
  lifecycleEvents: LifecycleEvent[];
  status: DebugStatus;
  summary: DebugSummary | null;
}

export interface EntitlementCheckResult {
  timestamp: string;
  trigger: string;
  restoredDataLength: number;
  activePurchasesCount: number;
  activeEntitlementIds: string[];
  activeProductIds: string[];
  expirationDates: string[];
  premiumFound: boolean;
  rawPayload: any;
}

export interface LifecycleEvent {
  timestamp: string;
  event: string;
  visibilityState: string;
  purchasePending: boolean;
  callbackFired: boolean;
  entitlementCheckRun: boolean;
  sessionId: string;
}

export type DebugStatus =
  | 'idle'
  | 'launching'
  | 'waiting_for_callback'
  | 'callback_received'
  | 'callback_missing'
  | 'no_entitlement_found'
  | 'entitlement_found_ui_not_updated'
  | 'paywall_closed_no_purchase'
  | 'purchase_may_have_completed'
  | 'confirmed'
  | 'error';

export interface DebugSummary {
  sessionId: string;
  launchAttempted: boolean;
  launchSucceeded: boolean;
  callbackRegistered: boolean;
  callbackReceived: boolean;
  purchaseHistoryChecked: boolean;
  activeEntitlementFound: boolean;
  premiumStateUpdated: boolean;
  timeoutTriggered: boolean;
  lastKnownFailurePoint: string | null;
  totalElapsedMs: number;
}

// ─── State ────────────────────────────────────────────────────────────

let _currentSession: DebugSession | null = null;
let _allSessions: DebugSession[] = [];
let _listeners: Array<() => void> = [];
const _LOG_PREFIX = '[RevenueCat Debug]';

function notify() {
  _listeners.forEach((fn) => fn());
}

export function subscribeDebugSession(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

export function getCurrentDebugSession(): DebugSession | null {
  return _currentSession;
}

export function getAllDebugSessions(): DebugSession[] {
  return _allSessions;
}

// ─── Session lifecycle ────────────────────────────────────────────────

export function startDebugSession(opts: {
  userId: string | null;
  offeringId: string | null;
  productId: string | null;
}): DebugSession {
  const id = `pds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: DebugSession = {
    id,
    startedAt: new Date().toISOString(),
    platform: getPlatform(),
    isNative: isDespia(),
    isAndroid: isDespiaAndroid(),
    isDespia: isDespia(),
    userId: opts.userId,
    offeringId: opts.offeringId,
    productId: opts.productId,
    route: typeof window !== 'undefined' ? window.location.pathname : '',
    appVersion: (window as any).__APP_VERSION__ || 'unknown',
    callbackRegistered: false,
    callbackRegisteredAt: null,
    paywallLaunched: false,
    paywallLaunchedAt: null,
    despiaDispatchMs: null,
    despiaResult: null,
    callbackReceived: false,
    callbackReceivedAt: null,
    callbackPayload: null,
    entitlementChecks: [],
    entitlementFound: false,
    premiumStateUpdated: false,
    previousPlan: null,
    newPlan: null,
    planUpdateSource: null,
    timeoutTriggered: false,
    lastError: null,
    lastDespiaResult: null,
    lifecycleEvents: [],
    status: 'idle',
    summary: null,
  };

  _currentSession = session;
  _allSessions.push(session);

  dbg('Session started', {
    sessionId: id,
    platform: session.platform,
    isNative: session.isNative,
    isAndroid: session.isAndroid,
    userId: session.userId,
    productId: session.productId,
    route: session.route,
  });

  notify();
  return session;
}

export function updateSession(updates: Partial<DebugSession>) {
  if (!_currentSession) return;
  Object.assign(_currentSession, updates);
  notify();
}

export function endSession() {
  if (!_currentSession) return;
  const s = _currentSession;
  const startMs = new Date(s.startedAt).getTime();
  const totalElapsedMs = Date.now() - startMs;

  let lastKnownFailurePoint: string | null = null;
  if (!s.paywallLaunched) lastKnownFailurePoint = 'paywall_launch';
  else if (!s.callbackRegistered) lastKnownFailurePoint = 'callback_registration';
  else if (s.timeoutTriggered && !s.callbackReceived) lastKnownFailurePoint = 'callback_never_fired';
  else if (!s.entitlementFound) lastKnownFailurePoint = 'no_entitlement';
  else if (!s.premiumStateUpdated) lastKnownFailurePoint = 'ui_state_not_updated';
  else if (s.lastError) lastKnownFailurePoint = `error: ${s.lastError}`;

  const summary: DebugSummary = {
    sessionId: s.id,
    launchAttempted: s.paywallLaunched || s.status !== 'idle',
    launchSucceeded: s.paywallLaunched,
    callbackRegistered: s.callbackRegistered,
    callbackReceived: s.callbackReceived,
    purchaseHistoryChecked: s.entitlementChecks.length > 0,
    activeEntitlementFound: s.entitlementFound,
    premiumStateUpdated: s.premiumStateUpdated,
    timeoutTriggered: s.timeoutTriggered,
    lastKnownFailurePoint,
    totalElapsedMs,
  };

  s.summary = summary;

  console.log(`${_LOG_PREFIX} ═══════════════════════════════════════`);
  console.log(`${_LOG_PREFIX} Purchase Debug Summary`);
  console.log(`${_LOG_PREFIX} ───────────────────────────────────────`);
  Object.entries(summary).forEach(([k, v]) => {
    console.log(`${_LOG_PREFIX}   ${k}: ${JSON.stringify(v)}`);
  });
  console.log(`${_LOG_PREFIX} ═══════════════════════════════════════`);

  notify();
}

// ─── Logging helpers ──────────────────────────────────────────────────

export function dbg(label: string, data?: any) {
  const ts = new Date().toISOString().slice(11, 23);
  const sid = _currentSession?.id?.slice(-6) || '------';
  if (data !== undefined) {
    console.log(`${_LOG_PREFIX} [${ts}] [${sid}] ${label}`, data);
  } else {
    console.log(`${_LOG_PREFIX} [${ts}] [${sid}] ${label}`);
  }
}

export function dbgError(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`${_LOG_PREFIX} ❌ ${label}: ${msg}`);
  if (stack) console.error(`${_LOG_PREFIX}   stack: ${stack}`);
  if (_currentSession) {
    _currentSession.lastError = msg;
    notify();
  }
}

// ─── Callback verification ───────────────────────────────────────────

export function checkCallbackRegistration(): { purchaseCallbackExists: boolean; dismissCallbackExists: boolean; errorCallbackExists: boolean } {
  const result = {
    purchaseCallbackExists: typeof window.onRevenueCatPurchase === 'function',
    dismissCallbackExists: typeof (window as any).onRevenueCatPaywallDismiss === 'function',
    errorCallbackExists: typeof (window as any).onRevenueCatPurchaseError === 'function',
  };
  dbg('Callback registration check', result);
  if (!result.purchaseCallbackExists) {
    console.warn(`${_LOG_PREFIX} ⚠️ HIGH PRIORITY: window.onRevenueCatPurchase is NOT registered!`);
  }
  if (!result.errorCallbackExists) {
    dbg('No error callback (window.onRevenueCatPurchaseError) registered — errors may be silent');
  }
  return result;
}

// ─── Entitlement check helper ────────────────────────────────────────

export function recordEntitlementCheck(trigger: string, rawData: any): EntitlementCheckResult {
  const purchases: any[] = rawData?.restoredData ?? [];
  const active = purchases.filter((p: any) => p.isActive);

  const result: EntitlementCheckResult = {
    timestamp: new Date().toISOString(),
    trigger,
    restoredDataLength: purchases.length,
    activePurchasesCount: active.length,
    activeEntitlementIds: active.map((p: any) => p.entitlementId || 'unknown'),
    activeProductIds: active.map((p: any) => p.productId || 'unknown'),
    expirationDates: active.map((p: any) => p.expirationDate || 'none'),
    premiumFound: active.length > 0,
    rawPayload: rawData,
  };

  dbg(`Entitlement check [${trigger}]`, {
    totalPurchases: result.restoredDataLength,
    activePurchases: result.activePurchasesCount,
    activeEntitlementIds: result.activeEntitlementIds,
    activeProductIds: result.activeProductIds,
    expirations: result.expirationDates,
    premiumFound: result.premiumFound,
  });

  if (_currentSession) {
    _currentSession.entitlementChecks.push(result);
    if (result.premiumFound) _currentSession.entitlementFound = true;
    notify();
  }

  return result;
}

// ─── Lifecycle event recorder ────────────────────────────────────────

export function recordLifecycleEvent(event: string, extra?: Partial<LifecycleEvent>) {
  if (!_currentSession) return;
  const entry: LifecycleEvent = {
    timestamp: new Date().toISOString(),
    event,
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
    purchasePending: _currentSession.status === 'waiting_for_callback' || _currentSession.status === 'launching',
    callbackFired: _currentSession.callbackReceived,
    entitlementCheckRun: _currentSession.entitlementChecks.length > 0,
    sessionId: _currentSession.id,
    ...extra,
  };
  _currentSession.lifecycleEvents.push(entry);
  dbg(`Lifecycle: ${event}`, {
    visibilityState: entry.visibilityState,
    purchasePending: entry.purchasePending,
    callbackFired: entry.callbackFired,
  });
  notify();
}

// ─── Plan state change tracker ───────────────────────────────────────

export function recordPlanChange(previousPlan: string | null, newPlan: string | null, source: string) {
  dbg('Plan state change', { previousPlan, newPlan, source });
  if (_currentSession) {
    _currentSession.previousPlan = previousPlan;
    _currentSession.newPlan = newPlan;
    _currentSession.planUpdateSource = source;
    if (newPlan && newPlan !== 'free' && newPlan !== previousPlan) {
      _currentSession.premiumStateUpdated = true;
    }
    notify();
  }
}

// Global type augmentation
declare global {
  interface Window {
    onRevenueCatPurchase?: () => void;
    onRevenueCatPurchaseError?: (err: any) => void;
  }
}
