/**
 * Apple Auth Debug Panel — admin/test-only diagnostic view.
 *
 * Shows the latest Apple Sign In attempts with stage-by-stage breakdown,
 * error categorization, and a "Copy Diagnostics" button for bug tickets.
 *
 * TEMPORARY: Remove after Apple Sign In issues are resolved.
 */

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getAppleAuthAttempts,
  clearAppleAuthAttempts,
  subscribeAppleAuthAudit,
  exportAttemptDiagnostics,
  type AppleAuthAttempt,
  type AppleAuthStage,
} from '@/lib/appleAuthAudit';
import { Apple, Copy, Trash2, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const STAGE_LABELS: Record<AppleAuthStage, string> = {
  tap_initiated: 'Tap Initiated',
  environment_detected: 'Environment Detected',
  flow_selected: 'Flow Selected',
  js_sdk_invoked: 'JS SDK Invoked',
  js_sdk_response: 'JS SDK Response',
  oauth_url_requested: 'OAuth URL Requested',
  oauth_url_received: 'OAuth URL Received',
  system_browser_opened: 'System Browser Opened',
  broker_invoked: 'Broker Invoked',
  redirect_started: 'Redirect Started',
  callback_received: 'Callback Received',
  token_exchange_started: 'Token Exchange Started',
  token_exchange_result: 'Token Exchange Result',
  session_creation_started: 'Session Creation',
  session_creation_result: 'Session Result',
  session_verified: 'Session Verified',
  navigation_complete: 'Navigation Complete',
  error: 'Error',
  cancelled: 'Cancelled',
  background_resume: 'Background Resume',
};

function StatusIcon({ success }: { success: boolean | null }) {
  if (success === null) return <Clock className="w-4 h-4 text-yellow-400" />;
  if (success) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

function AttemptCard({ attempt }: { attempt: AppleAuthAttempt }) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = useCallback(() => {
    const report = exportAttemptDiagnostics(attempt);
    navigator.clipboard.writeText(report).then(() => {
      toast.success('Diagnostics copied to clipboard');
    }).catch(() => {
      // Fallback for environments without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Diagnostics copied');
    });
  }, [attempt]);

  const time = new Date(attempt.startedAt).toLocaleTimeString();
  const duration = attempt.completedAt
    ? `${((new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000).toFixed(1)}s`
    : 'ongoing';

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon success={attempt.success} />
          <span className="text-xs font-mono text-foreground">{time}</span>
          <Badge variant="outline" className="text-[10px]">
            {attempt.metadata.deviceType}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {attempt.metadata.flowType}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{duration}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy diagnostics">
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Flow path label */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">Flow:</span>
        <Badge
          variant={attempt.metadata.flowType === 'native_oauth_redirect' ? 'default' : 'outline'}
          className="text-[10px]"
        >
          {attempt.metadata.flowType === 'native_oauth_redirect' ? 'OAuth Redirect'
            : attempt.metadata.flowType === 'js_sdk' ? 'JS SDK'
            : attempt.metadata.flowType === 'lovable_broker' ? 'Lovable Broker'
            : attempt.metadata.flowType || 'Unknown'}
        </Badge>
        {attempt.success === true && (
          <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30">Native Return Complete</Badge>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">Last stage:</span>
        <span className="text-foreground font-medium">{STAGE_LABELS[attempt.lastStage]}</span>
      </div>

      {attempt.errorCategory && (
        <div className="flex items-center gap-2 text-[11px]">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <Badge variant="destructive" className="text-[10px]">{attempt.errorCategory}</Badge>
          <span className="text-red-400 truncate">{attempt.errorMessage?.slice(0, 60)}</span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-mono text-foreground">{attempt.metadata.platform} ({attempt.metadata.deviceType})</span>
            <span className="text-muted-foreground">Native</span>
            <span className="font-mono text-foreground">{attempt.metadata.isNative ? 'Yes' : 'No'} (Despia: {attempt.metadata.isDespia ? 'Yes' : 'No'})</span>
            <span className="text-muted-foreground">Despia iOS</span>
            <span className="font-mono text-foreground">{attempt.metadata.isDespiaIOS ? 'Yes' : 'No'}</span>
            <span className="text-muted-foreground">Custom Domain</span>
            <span className="font-mono text-foreground">{attempt.metadata.isCustomDomain ? 'Yes' : 'No'}</span>
            <span className="text-muted-foreground">Origin</span>
            <span className="font-mono text-foreground truncate">{attempt.metadata.origin}</span>
            <span className="text-muted-foreground">Redirect URI</span>
            <span className="font-mono text-foreground truncate">{attempt.metadata.redirectUri}</span>
            {attempt.metadata.callbackUriReturned && (
              <>
                <span className="text-muted-foreground">Callback URI</span>
                <span className="font-mono text-foreground truncate">{attempt.metadata.callbackUriReturned}</span>
              </>
            )}
            <span className="text-muted-foreground">Token Present</span>
            <span className="font-mono text-foreground">{attempt.metadata.tokenPresent ? `Yes (${attempt.metadata.tokenLength} chars)` : 'No'}</span>
            <span className="text-muted-foreground">Session</span>
            <span className="font-mono text-foreground">{attempt.metadata.sessionEstablished ? 'Established' : 'Not established'}</span>
            <span className="text-muted-foreground">BG Resumed</span>
            <span className="font-mono text-foreground">{attempt.metadata.backgroundResumed ? 'Yes' : 'No'}</span>
          </div>

          {/* Event timeline */}
          <div className="mt-2">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Event Timeline:</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {attempt.events.map((event, i) => {
                const ts = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any);
                return (
                  <div key={i} className="text-[9px] font-mono leading-tight">
                    <span className="text-muted-foreground">{ts}</span>{' '}
                    <span className={event.stage === 'error' ? 'text-red-400' : event.stage === 'session_verified' ? 'text-green-400' : 'text-foreground'}>
                      {event.stage}
                    </span>
                    {event.data && (
                      <span className="text-muted-foreground ml-1">
                        {JSON.stringify(event.data).slice(0, 120)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User agent */}
          <p className="text-[9px] text-muted-foreground break-all mt-1">
            UA: {attempt.metadata.userAgent}
          </p>
        </div>
      )}
    </div>
  );
}

export function AppleAuthDebugPanel() {
  const [attempts, setAttempts] = useState<AppleAuthAttempt[]>([]);

  useEffect(() => {
    setAttempts(getAppleAuthAttempts());
    const unsub = subscribeAppleAuthAudit(() => {
      setAttempts(getAppleAuthAttempts());
    });
    return unsub;
  }, []);

  const handleClearAll = () => {
    clearAppleAuthAttempts();
    setAttempts([]);
    toast.success('Audit trail cleared');
  };

  const handleCopyAll = () => {
    const allReports = attempts.map(a => exportAttemptDiagnostics(a)).join('\n\n' + '='.repeat(50) + '\n\n');
    navigator.clipboard.writeText(allReports).then(() => {
      toast.success('All diagnostics copied');
    });
  };

  const latest = [...attempts].reverse().slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Apple Auth Debug</h3>
          <Badge variant="outline" className="text-[10px]">{attempts.length} attempts</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopyAll} disabled={attempts.length === 0}>
            <Copy className="w-3 h-3 mr-1" />
            Copy All
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={handleClearAll} disabled={attempts.length === 0}>
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {latest.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Apple className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No Apple Sign In attempts recorded yet.</p>
          <p className="text-xs mt-1">Tap "Continue with Apple" to start capturing diagnostics.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {latest.map(attempt => (
            <AttemptCard key={attempt.id} attempt={attempt} />
          ))}
        </div>
      )}
    </div>
  );
}
