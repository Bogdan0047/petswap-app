import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Rocket, ArrowLeft, PlayCircle, ShieldQuestion } from 'lucide-react';
import { toast } from 'sonner';
import {
  runFullAudit,
  isAuditPassing,
  hasFailures,
  isPublishGuardPassing,
  getGuardBlockers,
  type CheckResult,
} from '@/lib/safePublishChecks';
import { clearRecordedErrors } from '@/lib/consoleErrorRecorder';
import { computeReadiness, type ReadinessItem } from '@/lib/productionReadiness';
import { supabase } from '@/integrations/supabase/client';

/**
 * Safe Auto Publish dashboard — dev-only.
 *
 * Lets the developer:
 *   1. Run the full button + navigation audit
 *   2. See per-flow status for the critical journeys
 *   3. If everything passes, get a one-click "Publish to Live" path
 *
 * Publishing on Lovable requires clicking the platform's Publish button —
 * we surface clear, honest instructions instead of pretending we can fully automate it.
 */
const SafePublish = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [readiness, setReadiness] = useState<ReadinessItem[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  // In production, restrict to admins. In dev, always allow.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!import.meta.env.PROD) {
        if (!cancelled) { setAllowed(true); setAccessChecked(true); }
        return;
      }
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) {
        if (!cancelled) { setAllowed(false); setAccessChecked(true); }
        return;
      }
      const { data } = await supabase.rpc('has_role', { _user_id: ud.user.id, _role: 'admin' });
      if (!cancelled) { setAllowed(!!data); setAccessChecked(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setReadinessLoading(true);
      const r = await computeReadiness();
      if (!cancelled) { setReadiness(r); setReadinessLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [allowed]);

  if (!accessChecked) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div>
          <ShieldQuestion size={28} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">Admins only</p>
          <p className="text-sm text-muted-foreground">The publish dashboard is restricted on live.</p>
        </div>
      </div>
    );
  }

  const start = async () => {
    setRunning(true);
    setHasRun(true);
    // Reset console-error buffer so the guard reflects only this run forward.
    clearRecordedErrors();
    try {
      await runFullAudit({ onUpdate: (r) => setResults([...r]) });
    } finally {
      setRunning(false);
    }
  };

  const passing = !running && hasRun && isAuditPassing(results);
  const failing = !running && hasRun && hasFailures(results);
  const guardPassing = !running && hasRun && isPublishGuardPassing(results);
  const guardBlockers = hasRun ? getGuardBlockers(results) : [];

  const openPublishHelp = () => {
    if (!guardPassing) {
      toast.error('Publish blocked by Auto Publish Guard', {
        description: guardBlockers.join(' • ') || 'Run the audit first.',
        duration: 6000,
      });
      return;
    }
    toast.success('Ready to publish — open the Lovable Publish dialog', {
      description:
        'Desktop: top-right Publish button. Mobile: ⋯ menu → Publish. Then click Update.',
      duration: 8000,
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold tracking-tight">Safe Auto Publish</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Run the audit. The Auto Publish Guard blocks publish unless routes resolve, navigation
          is clean, APIs respond, and the console has no errors.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={start}
            disabled={running}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
            {running ? 'Running audit…' : hasRun ? 'Re-run audit' : 'Run audit'}
          </button>
          <button
            onClick={start}
            disabled={running}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
          >
            Test flows
          </button>
        </div>

        {/* Status banner */}
        {hasRun && !running && (
          <div
            className={`mt-5 rounded-2xl p-4 border ${
              guardPassing
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {guardPassing ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <div className="flex-1">
                <p className="font-semibold">
                  {guardPassing
                    ? 'Ready to publish'
                    : 'Publish blocked by Auto Publish Guard'}
                </p>
                <p className="text-[13px] opacity-90 mt-0.5">
                  {guardPassing
                    ? passing
                      ? 'All checks passed. You can safely push this build live.'
                      : 'Guard checks passed. Some non-blocking flows still need attention — see below.'
                    : guardBlockers.length > 0
                      ? `Blocking: ${guardBlockers.join(' • ')}`
                      : failing
                        ? 'One or more checks failed. Review below.'
                        : 'Audit incomplete.'}
                </p>
                <button
                  onClick={openPublishHelp}
                  disabled={!guardPassing}
                  className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                    guardPassing
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  title={guardPassing ? 'Open publish instructions' : 'Fix blocking checks first'}
                >
                  <Rocket size={16} />
                  {guardPassing ? 'Publish to Live' : 'Publish blocked'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results list */}
        <ul className="mt-5 space-y-2">
          {(results.length > 0
            ? results
            : [
                'auth',
                'routes',
                'view-profile',
                'send-request',
                'messages',
                'location',
                'navigation',
                'api-health',
                'no-console-errors',
              ].map((id) => ({ id, label: defaultLabel(id), status: 'pending' as const }))
          ).map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <StatusIcon status={r.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.label}</p>
                {r.detail && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 break-words">{r.detail}</p>
                )}
              </div>
              {r.durationMs != null && (
                <span className="text-[11px] text-muted-foreground tabular-nums">{r.durationMs}ms</span>
              )}
            </li>
          ))}
        </ul>

        {/* Production readiness panel */}
        <h2 className="mt-8 mb-2 text-lg font-bold tracking-tight">Production readiness</h2>
        <p className="text-[12px] text-muted-foreground mb-3">
          Auth, profile, messages, request, location, Stripe, OAuth and Push status. Items marked
          "manual" must be confirmed on petswap.co.uk after publish.
        </p>
        {readinessLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Checking…
          </div>
        ) : (
          <ul className="space-y-2">
            {readiness.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                <ReadinessIcon status={r.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {r.label}
                    {r.manual && (
                      <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        manual
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 break-words">{r.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
          Note: Lovable publishing requires a manual click on the platform's Publish button —
          this panel verifies safety, then guides you through the final step.
        </p>
      </div>
    </div>
  );
};

const ReadinessIcon = ({ status }: { status: ReadinessItem['status'] }) => {
  if (status === 'pass') return <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />;
  if (status === 'fail') return <XCircle size={18} className="text-rose-600 mt-0.5" />;
  if (status === 'warn') return <AlertTriangle size={18} className="text-amber-600 mt-0.5" />;
  return <ShieldQuestion size={18} className="text-muted-foreground mt-0.5" />;
};

const defaultLabel = (id: string) => {
  switch (id) {
    case 'auth':
      return 'Auth service reachable';
    case 'routes':
      return 'Critical routes mount';
    case 'view-profile':
      return 'View profile opens public profile';
    case 'send-request':
      return 'Send request flow available';
    case 'messages':
      return 'Messages / Inbox loads';
    case 'location':
      return 'Location verify available';
    case 'navigation':
      return 'No broken navigation';
    case 'api-health':
      return 'API calls return success';
    case 'no-console-errors':
      return 'No console errors';
    default:
      return id;
  }
};

const StatusIcon = ({ status }: { status: CheckResult['status'] }) => {
  if (status === 'pass') return <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />;
  if (status === 'fail') return <XCircle size={18} className="text-rose-600 mt-0.5" />;
  if (status === 'warn') return <AlertTriangle size={18} className="text-amber-600 mt-0.5" />;
  if (status === 'running') return <Loader2 size={18} className="text-primary animate-spin mt-0.5" />;
  return <div className="w-[18px] h-[18px] rounded-full border-2 border-muted mt-0.5" />;
};

export default SafePublish;
