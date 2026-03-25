/**
 * TEMPORARY: Apple Sign-In diagnostic tracker.
 * Remove after white-screen issue is diagnosed.
 *
 * Stores structured events with timestamps for each auth stage.
 * Persists the latest 10 attempts to localStorage so data
 * survives page refreshes.
 */

import { getPlatform, isNativeApp, isDespiaIOS } from '@/lib/platform';

const STORAGE_KEY = 'hj_apple_auth_debug';
const MAX_ATTEMPTS = 10;

export interface AuthDebugEvent {
  stage: string;
  timestamp: number;
  elapsed: number; // ms since attempt started
  data?: Record<string, unknown>;
}

export interface AuthDebugAttempt {
  id: string;
  provider: 'apple' | 'google';
  startedAt: number;
  events: AuthDebugEvent[];
  metadata: Record<string, unknown>;
  status: 'in_progress' | 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

let _currentAttempt: AuthDebugAttempt | null = null;
let _listeners: Array<() => void> = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

export function getCurrentAttempt(): AuthDebugAttempt | null {
  return _currentAttempt;
}

export function startAttempt(provider: 'apple' | 'google'): void {
  const now = Date.now();
  _currentAttempt = {
    id: `${provider}-${now}`,
    provider,
    startedAt: now,
    events: [],
    metadata: {
      platform: getPlatform(),
      isNative: isNativeApp(),
      isDespiaIOS: isDespiaIOS(),
      userAgent: navigator.userAgent.substring(0, 120),
      currentUrl: window.location.href,
      referrer: document.referrer || 'none',
    },
    status: 'in_progress',
  };
  logEvent('attempt_started', { provider });
  notify();
}

export function logEvent(stage: string, data?: Record<string, unknown>): void {
  if (!_currentAttempt) return;
  const now = Date.now();
  const event: AuthDebugEvent = {
    stage,
    timestamp: now,
    elapsed: now - _currentAttempt.startedAt,
    data,
  };
  _currentAttempt.events.push(event);

  // Structured console log
  console.log(
    `[AuthDebug:${_currentAttempt.provider}] ${stage} (+${event.elapsed}ms)`,
    data ? JSON.stringify(data) : ''
  );
  notify();
}

export function updateMetadata(key: string, value: unknown): void {
  if (!_currentAttempt) return;
  _currentAttempt.metadata[key] = value;
  notify();
}

export function completeAttempt(status: 'success' | 'error' | 'timeout', errorMessage?: string): void {
  if (!_currentAttempt) return;
  _currentAttempt.status = status;
  if (errorMessage) _currentAttempt.errorMessage = errorMessage;
  logEvent('attempt_completed', { status, errorMessage });
  persistAttempt(_currentAttempt);
  notify();
}

function maskSensitive(val: string): string {
  if (!val || val.length < 10) return '***';
  return val.substring(0, 6) + '...' + val.substring(val.length - 4);
}

export function logTokenPresence(params: {
  accessToken?: string | null;
  refreshToken?: string | null;
  code?: string | null;
  error?: string | null;
}): void {
  logEvent('token_presence', {
    accessToken: params.accessToken ? maskSensitive(params.accessToken) : 'missing',
    refreshToken: params.refreshToken ? maskSensitive(params.refreshToken) : 'missing',
    code: params.code ? maskSensitive(params.code) : 'missing',
    error: params.error || 'none',
  });
}

// ── Persistence ──────────────────────────────────────────────────────

function persistAttempt(attempt: AuthDebugAttempt): void {
  try {
    const history = getAttemptHistory();
    history.unshift(attempt);
    if (history.length > MAX_ATTEMPTS) history.length = MAX_ATTEMPTS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch { /* storage full or unavailable */ }
}

export function getAttemptHistory(): AuthDebugAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuthDebugAttempt[];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ── Resume from callback (page loaded fresh after redirect) ─────────

export function resumeOrCreateCallbackAttempt(): void {
  // If there's already a current attempt (SPA navigation), just log
  if (_currentAttempt && _currentAttempt.status === 'in_progress') {
    logEvent('callback_page_mounted_spa');
    return;
  }

  // Check if we have a pending attempt from before redirect
  const history = getAttemptHistory();
  const recent = history.find(
    (a) => a.status === 'in_progress' && Date.now() - a.startedAt < 120_000
  );

  if (recent) {
    // Resume it
    _currentAttempt = { ...recent, events: [...recent.events] };
    logEvent('callback_page_mounted_resumed', {
      elapsedSinceStart: Date.now() - recent.startedAt,
    });
  } else {
    // No pending attempt — create one for the callback
    startAttempt('apple');
    logEvent('callback_page_mounted_fresh', {
      note: 'No prior attempt found — created from callback',
    });
  }
}

// ── Debug flag ───────────────────────────────────────────────────────

const DEBUG_FLAG_KEY = 'hj_apple_auth_debug_enabled';

export function isDebugEnabled(): boolean {
  try {
    return localStorage.getItem(DEBUG_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDebugEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(DEBUG_FLAG_KEY, 'true');
    } else {
      localStorage.removeItem(DEBUG_FLAG_KEY);
    }
  } catch {}
}

/**
 * Call before redirect to persist the current attempt so we can
 * resume it when the callback page loads.
 */
export function persistBeforeRedirect(): void {
  if (!_currentAttempt) return;
  logEvent('redirect_starting');
  persistAttempt(_currentAttempt);
}

/**
 * Generate a plain-text diagnostic dump for clipboard.
 */
export function getDiagnosticText(attempt?: AuthDebugAttempt | null): string {
  const a = attempt || _currentAttempt;
  if (!a) return 'No active auth attempt.';

  const lines: string[] = [
    `=== Apple Auth Debug ===`,
    `ID: ${a.id}`,
    `Provider: ${a.provider}`,
    `Status: ${a.status}`,
    `Started: ${new Date(a.startedAt).toISOString()}`,
    a.errorMessage ? `Error: ${a.errorMessage}` : '',
    ``,
    `--- Metadata ---`,
    ...Object.entries(a.metadata).map(([k, v]) => `  ${k}: ${String(v)}`),
    ``,
    `--- Events (${a.events.length}) ---`,
    ...a.events.map(
      (e) =>
        `  +${String(e.elapsed).padStart(6)}ms  ${e.stage}${e.data ? '  ' + JSON.stringify(e.data) : ''}`
    ),
  ];
  return lines.filter(Boolean).join('\n');
}
