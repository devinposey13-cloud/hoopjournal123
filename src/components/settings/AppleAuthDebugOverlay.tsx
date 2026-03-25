/**
 * TEMPORARY: Floating debug overlay for Apple Sign-In diagnostics.
 * Shows only when debug flag is enabled (localStorage).
 * Remove after white-screen issue is resolved.
 */

import { useState, useEffect, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, X, Clock, History } from 'lucide-react';
import {
  getCurrentAttempt,
  subscribe,
  getAttemptHistory,
  getDiagnosticText,
  isDebugEnabled,
  clearHistory,
  type AuthDebugAttempt,
} from '@/lib/appleAuthDebugTracker';

function useTracker() {
  return useSyncExternalStore(
    subscribe,
    () => getCurrentAttempt(),
    () => null
  );
}

function StatusBadge({ status }: { status: AuthDebugAttempt['status'] }) {
  const colors: Record<string, string> = {
    in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    success: 'bg-green-500/20 text-green-300 border-green-500/40',
    error: 'bg-red-500/20 text-red-300 border-red-500/40',
    timeout: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${colors[status] || ''}`}>
      {status.toUpperCase()}
    </span>
  );
}

export function AppleAuthDebugOverlay() {
  const attempt = useTracker();
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AuthDebugAttempt[]>([]);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isDebugEnabled());
  }, []);

  // Update elapsed time display
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, []);

  if (!enabled) return null;

  const displayAttempt = selectedHistoryIdx !== null ? history[selectedHistoryIdx] : attempt;

  const handleCopy = () => {
    const text = getDiagnosticText(displayAttempt);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShowHistory = () => {
    setHistory(getAttemptHistory());
    setShowHistory(!showHistory);
    setSelectedHistoryIdx(null);
  };

  const elapsedTotal = displayAttempt
    ? ((Date.now() - displayAttempt.startedAt) / 1000).toFixed(1)
    : '—';

  const lastEvent = displayAttempt?.events[displayAttempt.events.length - 1];

  return (
    <div
      className="fixed bottom-20 right-2 z-[9999] max-w-[320px] w-[300px] rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg text-[11px] font-mono"
      style={{ maxHeight: collapsed ? '36px' : '60vh', overflow: 'hidden' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer bg-muted/50 border-b border-border"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-1.5">
          <span>🍎</span>
          <span className="font-semibold text-foreground">Auth Debug</span>
          {displayAttempt && <StatusBadge status={displayAttempt.status} />}
        </div>
        <div className="flex items-center gap-1">
          {displayAttempt && (
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {elapsedTotal}s
            </span>
          )}
          {collapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 36px)' }}>
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleShowHistory}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground"
            >
              <History className="w-3 h-3" />
              History
            </button>
            <button
              onClick={() => { clearHistory(); setHistory([]); }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-destructive ml-auto"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>

          {/* History list */}
          {showHistory && (
            <div className="px-2 py-1 border-b border-border space-y-0.5">
              {history.length === 0 ? (
                <p className="text-muted-foreground">No previous attempts</p>
              ) : (
                history.map((h, i) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHistoryIdx(i === selectedHistoryIdx ? null : i)}
                    className={`block w-full text-left px-1 py-0.5 rounded text-[10px] ${
                      i === selectedHistoryIdx ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    {h.provider} • {new Date(h.startedAt).toLocaleTimeString()} • {h.status}
                  </button>
                ))
              )}
            </div>
          )}

          {/* No attempt */}
          {!displayAttempt && (
            <div className="px-2 py-3 text-center text-muted-foreground">
              Waiting for Apple sign-in attempt…
            </div>
          )}

          {/* Metadata */}
          {displayAttempt && (
            <>
              <div className="px-2 py-1 border-b border-border">
                <p className="text-muted-foreground mb-0.5">Metadata</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                  {Object.entries(displayAttempt.metadata).map(([k, v]) => (
                    <div key={k} className="contents">
                      <span className="text-muted-foreground">{k}:</span>
                      <span className="text-foreground truncate">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events timeline */}
              <div className="px-2 py-1">
                <p className="text-muted-foreground mb-0.5">
                  Events ({displayAttempt.events.length})
                  {lastEvent && (
                    <span className="ml-1 text-foreground">
                      Last: {lastEvent.stage}
                    </span>
                  )}
                </p>
                <div className="space-y-0.5">
                  {displayAttempt.events.map((e, i) => {
                    const isWarning = e.elapsed > 2000;
                    const isDanger = e.elapsed > 5000;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-1 ${
                          isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-foreground'
                        }`}
                      >
                        <span className="text-muted-foreground w-14 text-right shrink-0">
                          +{e.elapsed}ms
                        </span>
                        <span className="break-all">
                          {e.stage}
                          {e.data && (
                            <span className="text-muted-foreground ml-1">
                              {JSON.stringify(e.data).substring(0, 80)}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {displayAttempt.errorMessage && (
                <div className="px-2 py-1 border-t border-border text-red-400">
                  Error: {displayAttempt.errorMessage}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
