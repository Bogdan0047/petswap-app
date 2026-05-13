import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * In-app OAuth diagnostics screen.
 *
 * Surfaces the OAuth lifecycle data that's otherwise only visible in DevTools:
 *  - Last callback URL captured during the OAuth roundtrip
 *  - Current session presence (user id, provider, expires)
 *  - Pending flags in sessionStorage (petswap_oauth_pending, petswap_just_signed_up)
 *  - Persistent debug log written by Auth.tsx (petswap_oauth_debug)
 *
 * Available at /dev/oauth-diagnostics in any environment so we can verify the
 * post-login redirect-to-/home behaviour on production (petswap.co.uk) without
 * needing console access.
 */

type DebugEntry = { t: string; tag: string; data?: unknown };

const DEBUG_KEY = "petswap_oauth_debug";
const CALLBACK_KEY = "petswap_oauth_last_callback";
const PENDING_KEY = "petswap_oauth_pending";
const SIGNUP_KEY = "petswap_just_signed_up";

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

type SessionInfo = {
  hasSession: boolean;
  userId?: string;
  email?: string;
  provider?: string;
  expiresAt?: string;
  error?: string;
};

const OAuthDiagnostics = () => {
  const navigate = useNavigate();
  const [log, setLog] = useState<DebugEntry[]>([]);
  const [lastCallback, setLastCallback] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [justSignedUp, setJustSignedUp] = useState<boolean>(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({ hasSession: false });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setLog(readJSON<DebugEntry[]>(DEBUG_KEY, []));
    setLastCallback(sessionStorage.getItem(CALLBACK_KEY));
    setPendingProvider(sessionStorage.getItem(PENDING_KEY));
    setJustSignedUp(sessionStorage.getItem(SIGNUP_KEY) === "1");
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setSessionInfo({ hasSession: false, error: error.message });
      } else if (data.session) {
        setSessionInfo({
          hasSession: true,
          userId: data.session.user.id,
          email: data.session.user.email ?? undefined,
          provider: data.session.user.app_metadata?.provider as string | undefined,
          expiresAt: data.session.expires_at
            ? new Date(data.session.expires_at * 1000).toISOString()
            : undefined,
        });
      } else {
        setSessionInfo({ hasSession: false });
      }
    } catch (e) {
      setSessionInfo({ hasSession: false, error: e instanceof Error ? e.message : String(e) });
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const clearAll = () => {
    sessionStorage.removeItem(DEBUG_KEY);
    sessionStorage.removeItem(CALLBACK_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(SIGNUP_KEY);
    void refresh();
  };

  const goHome = () => navigate("/home");

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom px-5 pt-4 pb-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refresh()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-semibold mb-1">OAuth Diagnostics</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Verify the OAuth roundtrip and post-login redirect to <code>/home</code>.
        </p>

        {/* Session card */}
        <section className="rounded-2xl border border-border p-4 mb-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            {sessionInfo.hasSession ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500" />
            )}
            <h2 className="font-semibold">Session</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : sessionInfo.hasSession ? (
            <dl className="text-xs space-y-1">
              <Row label="User ID" value={sessionInfo.userId} />
              <Row label="Email" value={sessionInfo.email} />
              <Row label="Provider" value={sessionInfo.provider} />
              <Row label="Expires" value={sessionInfo.expiresAt} />
              <div className="pt-2">
                <button
                  onClick={goHome}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
                >
                  Continue to /home
                </button>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active session. {sessionInfo.error ? `Error: ${sessionInfo.error}` : ""}
            </p>
          )}
        </section>

        {/* Pending flags */}
        <section className="rounded-2xl border border-border p-4 mb-4 bg-card">
          <h2 className="font-semibold mb-2">Pending flags</h2>
          <dl className="text-xs space-y-1">
            <Row label="petswap_oauth_pending" value={pendingProvider ?? "—"} />
            <Row label="petswap_just_signed_up" value={justSignedUp ? "1" : "—"} />
          </dl>
        </section>

        {/* Last callback URL */}
        <section className="rounded-2xl border border-border p-4 mb-4 bg-card">
          <h2 className="font-semibold mb-2">Last OAuth callback URL</h2>
          {lastCallback ? (
            <code className="block text-[11px] break-all bg-muted rounded-lg p-2">
              {lastCallback}
            </code>
          ) : (
            <p className="text-sm text-muted-foreground">No callback recorded yet.</p>
          )}
        </section>

        {/* Debug log */}
        <section className="rounded-2xl border border-border p-4 bg-card">
          <h2 className="font-semibold mb-2">Debug log ({log.length})</h2>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events captured. Trigger Google or Apple sign-in from <code>/auth</code>.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {log.map((e, i) => (
                <li key={i} className="text-[11px] font-mono">
                  <span className="text-muted-foreground">{e.t}</span>{" "}
                  <span className="font-semibold">{e.tag}</span>
                  {e.data !== undefined && (
                    <pre className="mt-0.5 ml-4 bg-muted rounded p-1.5 whitespace-pre-wrap break-all">
                      {typeof e.data === "string" ? e.data : JSON.stringify(e.data, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex gap-2">
    <dt className="text-muted-foreground min-w-[110px]">{label}</dt>
    <dd className="font-mono break-all">{value ?? "—"}</dd>
  </div>
);

export default OAuthDiagnostics;
