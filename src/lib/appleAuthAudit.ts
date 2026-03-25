/**
 * Apple Auth Audit Trail — end-to-end diagnostic logger for Apple Sign In.
 *
 * Captures every stage of the Apple auth flow with timestamps, platform
 * metadata, and sanitized values. Stored in memory (latest 50 attempts)
 * and optionally persisted to localStorage for cross-reload survival.
 *
 * TEMPORARY: Remove after Apple Sign In issues are resolved.
 */

import { getPlatform, isNativeApp, isDespia, isDespiaIOS, isDespiaAndroid } from '@/lib/platform';
import { isCustomDomain, getOAuthRedirectUri, APPLE_CLIENT_ID, APP_ORIGIN } from '@/lib/authConfig';

// ── Types ────────────────────────────────────────────────────────────

export type AppleAuthStage =
  | 'tap_initiated'
  | 'environment_detected'
  | 'flow_selected'
  | 'js_sdk_invoked'
  | 'js_sdk_response'
  | 'oauth_url_requested'
  | 'oauth_url_received'
  | 'system_browser_opened'
  | 'broker_invoked'
  | 'redirect_started'
  | 'callback_received'
  | 'token_exchange_started'
  | 'token_exchange_result'
  | 'session_creation_started'
  | 'session_creation_result'
  | 'session_verified'
  | 'navigation_complete'
  | 'error'
  | 'cancelled'
  | 'background_resume';

export type AppleAuthErrorCategory =
  | 'invalid_client'
  | 'redirect_mismatch'
  | 'callback_not_received'
  | 'state_mismatch'
  | 'token_exchange_failed'
  | 'session_not_persisted'
  | 'native_return_failed'
  | 'js_sdk_unavailable'
  | 'user_cancelled'
  | 'unknown_provider_error';

export interface AppleAuthEvent {
  stage: AppleAuthStage;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface AppleAuthAttempt {
  id: string;
  startedAt: string;
  completedAt?: string;
  success: boolean | null; // null = in-progress
  errorCategory?: AppleAuthErrorCategory;
  errorMessage?: string;
  lastStage: AppleAuthStage;
  events: AppleAuthEvent[];
  metadata: AppleAuthMetadata;
}

export interface AppleAuthMetadata {
  platform: string;
  isNative: boolean;
  isDespia: boolean;
  isDespiaIOS: boolean;
  isDespiaAndroid: boolean;
  isCustomDomain: boolean;
  userAgent: string;
  origin: string;
  redirectUri: string;
  callbackUriReturned?: string;
  appleClientId: string;
  appOrigin: string;
  flowType: string; // 'js_sdk' | 'oauth_redirect' | 'lovable_broker'
  deviceType: string; // 'iphone' | 'ipad' | 'android' | 'desktop' | 'unknown'
  hasStateNonce: boolean;
  stateNoncePartial?: string; // first 8 chars only
  tokenPresent: boolean;
  tokenLength?: number;
  sessionEstablished: boolean;
  providerErrorCode?: string;
  providerErrorMessage?: string;
  sdkErrorMessage?: string;
  backgroundResumed: boolean;
}

// ── State ────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 50;
let _attempts: AppleAuthAttempt[] = [];
let _currentAttempt: AppleAuthAttempt | null = null;
let _listeners: Array<() => void> = [];

// Load from localStorage on init
try {
  const stored = localStorage.getItem('hj_apple_auth_audit');
  if (stored) _attempts = JSON.parse(stored);
} catch { /* ignore */ }

function persist() {
  try {
    localStorage.setItem('hj_apple_auth_audit', JSON.stringify(_attempts.slice(-MAX_ATTEMPTS)));
  } catch { /* ignore */ }
  _listeners.forEach(fn => fn());
}

// ── Helpers ──────────────────────────────────────────────────────────

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return 'ipad';
  if (/iPhone/i.test(ua)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  if (/Macintosh|Windows|Linux/i.test(ua) && !/Mobile/i.test(ua)) return 'desktop';
  return 'unknown';
}

function generateId(): string {
  return `apple_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function maskToken(token?: string | null): { present: boolean; length?: number } {
  if (!token) return { present: false };
  return { present: true, length: token.length };
}

function maskPartial(value?: string | null, chars = 8): string | undefined {
  if (!value) return undefined;
  return value.slice(0, chars) + '…';
}

export function categorizeError(error: string | Error | unknown): AppleAuthErrorCategory {
  const msg = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('invalid_client')) return 'invalid_client';
  if (lower.includes('redirect') && lower.includes('mismatch')) return 'redirect_mismatch';
  if (lower.includes('cancelled') || lower.includes('canceled') || lower.includes('popup_closed') || lower.includes('user_cancelled')) return 'user_cancelled';
  if (lower.includes('state')) return 'state_mismatch';
  if (lower.includes('token') && (lower.includes('exchange') || lower.includes('failed'))) return 'token_exchange_failed';
  if (lower.includes('session') && (lower.includes('not') || lower.includes('missing'))) return 'session_not_persisted';
  if (lower.includes('sdk') || lower.includes('not loaded')) return 'js_sdk_unavailable';
  if (lower.includes('native') || lower.includes('deep') || lower.includes('return')) return 'native_return_failed';
  return 'unknown_provider_error';
}

// ── Public API ───────────────────────────────────────────────────────

/** Start a new Apple auth attempt. Returns the attempt ID. */
export function startAppleAuthAttempt(): string {
  const id = generateId();
  const now = new Date().toISOString();

  const redirectUri = (() => {
    try {
      if (isNativeApp()) return getOAuthRedirectUri({ forNative: true });
      if (isCustomDomain()) return `${window.location.origin}/auth/callback`;
      return window.location.origin;
    } catch { return 'unknown'; }
  })();

  _currentAttempt = {
    id,
    startedAt: now,
    success: null,
    lastStage: 'tap_initiated',
    events: [],
    metadata: {
      platform: getPlatform(),
      isNative: isNativeApp(),
      isDespia: isDespia(),
      isDespiaIOS: isDespiaIOS(),
      isDespiaAndroid: isDespiaAndroid(),
      isCustomDomain: isCustomDomain(),
      userAgent: navigator.userAgent,
      origin: window.location.origin,
      redirectUri,
      appleClientId: APPLE_CLIENT_ID || 'not_set',
      appOrigin: APP_ORIGIN,
      flowType: 'unknown',
      deviceType: detectDeviceType(),
      hasStateNonce: false,
      tokenPresent: false,
      sessionEstablished: false,
      backgroundResumed: false,
    },
  };

  logAppleAuthEvent('tap_initiated', { origin: window.location.origin });
  logAppleAuthEvent('environment_detected', {
    platform: _currentAttempt.metadata.platform,
    isNative: _currentAttempt.metadata.isNative,
    isDespiaIOS: _currentAttempt.metadata.isDespiaIOS,
    deviceType: _currentAttempt.metadata.deviceType,
    isCustomDomain: _currentAttempt.metadata.isCustomDomain,
    redirectUri: _currentAttempt.metadata.redirectUri,
    userAgent: _currentAttempt.metadata.userAgent.slice(0, 100),
  });

  console.log(`[AppleAuthAudit] ▶ Attempt ${id} started`, {
    platform: _currentAttempt.metadata.platform,
    deviceType: _currentAttempt.metadata.deviceType,
    redirectUri: _currentAttempt.metadata.redirectUri,
  });

  return id;
}

/** Log an event in the current attempt */
export function logAppleAuthEvent(stage: AppleAuthStage, data?: Record<string, unknown>) {
  if (!_currentAttempt) {
    console.warn(`[AppleAuthAudit] No active attempt for stage: ${stage}`);
    return;
  }

  const event: AppleAuthEvent = {
    stage,
    timestamp: new Date().toISOString(),
    data,
  };

  _currentAttempt.events.push(event);
  _currentAttempt.lastStage = stage;

  console.log(`[AppleAuthAudit] ${stage}`, data || '');
}

/** Update metadata on the current attempt */
export function updateAppleAuthMetadata(updates: Partial<AppleAuthMetadata>) {
  if (!_currentAttempt) return;
  Object.assign(_currentAttempt.metadata, updates);
}

/** Mark the current attempt as succeeded */
export function completeAppleAuthSuccess() {
  if (!_currentAttempt) return;
  _currentAttempt.success = true;
  _currentAttempt.completedAt = new Date().toISOString();
  _currentAttempt.metadata.sessionEstablished = true;
  logAppleAuthEvent('session_verified', { success: true });

  _attempts.push(_currentAttempt);
  if (_attempts.length > MAX_ATTEMPTS) _attempts = _attempts.slice(-MAX_ATTEMPTS);
  persist();

  console.log(`[AppleAuthAudit] ✅ Attempt ${_currentAttempt.id} succeeded`);
  _currentAttempt = null;
}

/** Mark the current attempt as failed */
export function completeAppleAuthFailure(error: unknown) {
  if (!_currentAttempt) return;
  const category = categorizeError(error);
  const msg = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);

  _currentAttempt.success = false;
  _currentAttempt.completedAt = new Date().toISOString();
  _currentAttempt.errorCategory = category;
  _currentAttempt.errorMessage = msg;
  logAppleAuthEvent('error', { category, message: msg });

  _attempts.push(_currentAttempt);
  if (_attempts.length > MAX_ATTEMPTS) _attempts = _attempts.slice(-MAX_ATTEMPTS);
  persist();

  console.error(`[AppleAuthAudit] ❌ Attempt ${_currentAttempt.id} failed: [${category}] ${msg}`);
  _currentAttempt = null;
}

/** Mark the current attempt as cancelled */
export function completeAppleAuthCancelled() {
  if (!_currentAttempt) return;
  _currentAttempt.success = false;
  _currentAttempt.completedAt = new Date().toISOString();
  _currentAttempt.errorCategory = 'user_cancelled';
  _currentAttempt.errorMessage = 'User cancelled Apple Sign In';
  logAppleAuthEvent('cancelled');

  _attempts.push(_currentAttempt);
  if (_attempts.length > MAX_ATTEMPTS) _attempts = _attempts.slice(-MAX_ATTEMPTS);
  persist();

  console.log(`[AppleAuthAudit] ⊘ Attempt ${_currentAttempt.id} cancelled`);
  _currentAttempt = null;
}

/** Get all stored attempts (latest 50) */
export function getAppleAuthAttempts(): AppleAuthAttempt[] {
  // Merge current in-progress attempt if active
  const result = [..._attempts];
  if (_currentAttempt) result.push(_currentAttempt);
  return result.slice(-MAX_ATTEMPTS);
}

/** Clear all stored attempts */
export function clearAppleAuthAttempts() {
  _attempts = [];
  try { localStorage.removeItem('hj_apple_auth_audit'); } catch { /* ignore */ }
  _listeners.forEach(fn => fn());
}

/** Get the current in-progress attempt */
export function getCurrentAttempt(): AppleAuthAttempt | null {
  return _currentAttempt;
}

/** Subscribe to changes */
export function subscribeAppleAuthAudit(listener: () => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter(fn => fn !== listener);
  };
}

/** Export a single attempt as a clean diagnostic report (for bug tickets) */
export function exportAttemptDiagnostics(attempt: AppleAuthAttempt): string {
  const lines: string[] = [
    `=== Apple Auth Diagnostic Report ===`,
    `Attempt: ${attempt.id}`,
    `Started: ${attempt.startedAt}`,
    `Completed: ${attempt.completedAt || 'in-progress'}`,
    `Result: ${attempt.success === null ? 'IN PROGRESS' : attempt.success ? 'SUCCESS' : 'FAILED'}`,
    `Last Stage: ${attempt.lastStage}`,
    '',
    `--- Environment ---`,
    `Platform: ${attempt.metadata.platform}`,
    `Device: ${attempt.metadata.deviceType}`,
    `Native: ${attempt.metadata.isNative}`,
    `Despia: ${attempt.metadata.isDespia}`,
    `Despia iOS: ${attempt.metadata.isDespiaIOS}`,
    `Custom Domain: ${attempt.metadata.isCustomDomain}`,
    `Origin: ${attempt.metadata.origin}`,
    `Flow Type: ${attempt.metadata.flowType}`,
    `User Agent: ${attempt.metadata.userAgent}`,
    '',
    `--- Auth Config ---`,
    `Apple Client ID: ${attempt.metadata.appleClientId}`,
    `App Origin: ${attempt.metadata.appOrigin}`,
    `Redirect URI: ${attempt.metadata.redirectUri}`,
    `Callback URI Returned: ${attempt.metadata.callbackUriReturned || 'N/A'}`,
    '',
    `--- State ---`,
    `State/Nonce Present: ${attempt.metadata.hasStateNonce}`,
    `State Partial: ${attempt.metadata.stateNoncePartial || 'N/A'}`,
    `Token Present: ${attempt.metadata.tokenPresent}`,
    `Token Length: ${attempt.metadata.tokenLength || 'N/A'}`,
    `Session Established: ${attempt.metadata.sessionEstablished}`,
    `Background Resumed: ${attempt.metadata.backgroundResumed}`,
    '',
  ];

  if (attempt.errorCategory) {
    lines.push(`--- Error ---`);
    lines.push(`Category: ${attempt.errorCategory}`);
    lines.push(`Message: ${attempt.errorMessage || 'N/A'}`);
    if (attempt.metadata.providerErrorCode) lines.push(`Provider Code: ${attempt.metadata.providerErrorCode}`);
    if (attempt.metadata.providerErrorMessage) lines.push(`Provider Message: ${attempt.metadata.providerErrorMessage}`);
    if (attempt.metadata.sdkErrorMessage) lines.push(`SDK Error: ${attempt.metadata.sdkErrorMessage}`);
    lines.push('');
  }

  lines.push(`--- Event Timeline ---`);
  attempt.events.forEach(e => {
    const dataStr = e.data ? ` ${JSON.stringify(e.data)}` : '';
    lines.push(`[${e.timestamp}] ${e.stage}${dataStr}`);
  });

  return lines.join('\n');
}

/** Utility: mask token for logging */
export { maskToken, maskPartial };
