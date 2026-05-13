import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import EmailAnalytics from "@/components/admin/EmailAnalytics";
import AdminPushDashboard from "@/components/admin/AdminPushDashboard";
import AdminCommunicationTimeline from "@/components/admin/AdminCommunicationTimeline";
import AdminConversionFunnel from "@/components/admin/AdminConversionFunnel";
import AdminRetentionTools from "@/components/admin/AdminRetentionTools";
import AdminViralMetrics from "@/components/admin/AdminViralMetrics";
import AdminMonetizationMetrics from "@/components/admin/AdminMonetizationMetrics";

interface EmailEvent {
  id: string;
  user_id: string | null;
  email_type: string;
  recipient_email: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  clicked_cta: string | null;
  converted: boolean;
  converted_at: string | null;
  created_at: string;
  variant: string | null;
  conversion_type: string | null;
}

const STATUS_FILTERS = ["all", "sent", "failed", "pending"] as const;

type AggBucket = { sent: number; opened: number; clicked: number; converted: number };

// Two-proportion z-test for conversion-rate difference. Returns true if the
// winning variant's lift is statistically significant at ~95% confidence
// AND each variant has at least `minSample` sends.
function isWinner(a: AggBucket, b: AggBucket, minSample = 100): 'A' | 'B' | null {
  if (a.sent < minSample || b.sent < minSample) return null;
  const pa = a.converted / a.sent;
  const pb = b.converted / b.sent;
  const p = (a.converted + b.converted) / (a.sent + b.sent);
  const se = Math.sqrt(p * (1 - p) * (1 / a.sent + 1 / b.sent));
  if (se === 0) return null;
  const z = (pb - pa) / se;
  if (z >= 1.96) return 'B';
  if (z <= -1.96) return 'A';
  return null;
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

export default function AdminEmails() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tab, setTab] = useState<"analytics" | "logs" | "push">("analytics");

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setEvents((data as EmailEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  const types = useMemo(() => {
    const s = new Set(events.map((e) => e.email_type));
    return ["all", ...Array.from(s).sort()];
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (typeFilter !== "all" && e.email_type !== typeFilter) return false;
      return true;
    });
  }, [events, statusFilter, typeFilter]);

  // Conversion metrics over the current filter window.
  // Open/click/conversion rates are computed against successfully sent emails.
  const metrics = useMemo(() => {
    const sent = filtered.filter((e) => e.status === "sent");
    const total = sent.length;
    const opened = sent.filter((e) => !!e.opened_at).length;
    const clicked = sent.filter((e) => !!e.clicked_at).length;
    const converted = sent.filter((e) => e.converted).length;
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
    return { total, opened, clicked, converted, openPct: pct(opened), clickPct: pct(clicked), convPct: pct(converted) };
  }, [filtered]);

  // Match → Chat → Booking funnel computed from sent emails in window.
  // Match→Chat: % of new-match sends that produced an open_chat conversion.
  // Chat→Booking: % of chat-no-booking-24h sends that converted.
  // Email→Booking: % of any sent email that converted with confirm_booking.
  const funnel = useMemo(() => {
    const sent = filtered.filter((e) => e.status === "sent");
    const matchSends = sent.filter((e) => e.email_type === "new-match");
    const matchConverted = matchSends.filter((e) => e.converted && e.clicked_cta === "open_chat").length;
    const chatNudgeSends = sent.filter((e) => e.email_type === "chat-no-booking-24h");
    const chatNudgeConverted = chatNudgeSends.filter((e) => e.converted).length;
    const bookingConverted = sent.filter((e) => e.converted && e.clicked_cta === "confirm_booking").length;
    const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));
    return {
      matchToChatPct: pct(matchConverted, matchSends.length),
      matchToChatLabel: `${matchConverted} / ${matchSends.length}`,
      chatToBookingPct: pct(chatNudgeConverted, chatNudgeSends.length),
      chatToBookingLabel: `${chatNudgeConverted} / ${chatNudgeSends.length}`,
      emailToBookingPct: pct(bookingConverted, sent.length),
      emailToBookingLabel: `${bookingConverted} / ${sent.length}`,
    };
  }, [filtered]);

  // Per-email-type A/B breakdown. Only includes types that have at least one
  // tagged variant in the current window.
  const abByType = useMemo(() => {
    const map = new Map<string, { A: AggBucket; B: AggBucket }>();
    const empty = (): AggBucket => ({ sent: 0, opened: 0, clicked: 0, converted: 0 });
    for (const e of filtered) {
      if (e.status !== 'sent') continue;
      if (e.variant !== 'A' && e.variant !== 'B') continue;
      let entry = map.get(e.email_type);
      if (!entry) { entry = { A: empty(), B: empty() }; map.set(e.email_type, entry); }
      const b = entry[e.variant];
      b.sent++;
      if (e.opened_at) b.opened++;
      if (e.clicked_at) b.clicked++;
      if (e.converted) b.converted++;
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="text-destructive mb-3" size={32} />
        <p className="text-foreground font-semibold">Admin access required</p>
        <button onClick={() => navigate("/profile")} className="mt-4 text-primary underline">Back to profile</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1"><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-semibold">Emails</h1>
        <button onClick={load} className="ml-auto p-2 text-muted-foreground hover:text-foreground" aria-label="Refresh">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="px-4 pt-3 flex gap-1 border-b border-border">
        {(["analytics", "logs", "push"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "push" && (
        <div className="px-4 pt-4 space-y-4">
          <AdminConversionFunnel />
          <AdminViralMetrics />
          <AdminMonetizationMetrics />
          <AdminRetentionTools />
          <AdminCommunicationTimeline />
          <AdminPushDashboard />
        </div>
      )}

      {tab === "analytics" && <EmailAnalytics />}

      {tab === "logs" && <>
      <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-border">

        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
        >
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Conversion metrics */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-border">
        <MetricCard label="Open rate" value={`${metrics.openPct}%`} sub={`${metrics.opened} / ${metrics.total}`} />
        <MetricCard label="Click rate" value={`${metrics.clickPct}%`} sub={`${metrics.clicked} / ${metrics.total}`} />
        <MetricCard label="Conversion" value={`${metrics.convPct}%`} sub={`${metrics.converted} / ${metrics.total}`} />
      </div>

      {/* Match → Chat → Booking funnel */}
      <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Match → Chat → Booking funnel
      </div>
      <div className="px-4 pb-3 grid grid-cols-3 gap-2 border-b border-border">
        <MetricCard label="Match → Chat" value={`${funnel.matchToChatPct}%`} sub={funnel.matchToChatLabel} />
        <MetricCard label="Chat → Booking" value={`${funnel.chatToBookingPct}%`} sub={funnel.chatToBookingLabel} />
        <MetricCard label="Email → Booking" value={`${funnel.emailToBookingPct}%`} sub={funnel.emailToBookingLabel} />
      </div>

      {/* A/B variant performance per email type */}
      {abByType.length > 0 && (
        <div className="border-b border-border">
          <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            A/B variant performance
          </div>
          <div className="px-4 pb-3 space-y-3">
            {abByType.map(([emailType, { A, B }]) => {
              const winner = isWinner(A, B);
              return (
                <div key={emailType} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2 text-sm font-semibold border-b border-border">{emailType}</div>
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium">Variant</th>
                        <th className="text-right px-2 py-1.5 font-medium">Sent</th>
                        <th className="text-right px-2 py-1.5 font-medium">Open %</th>
                        <th className="text-right px-2 py-1.5 font-medium">Click %</th>
                        <th className="text-right px-3 py-1.5 font-medium">Conv %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['A', 'B'] as const).map((v) => {
                        const b = v === 'A' ? A : B;
                        const isWin = winner === v;
                        return (
                          <tr key={v} className={isWin ? 'bg-primary/10' : ''}>
                            <td className="px-3 py-1.5 font-medium">
                              {v}
                              {isWin && <span className="ml-1.5 text-[10px] text-primary font-semibold">WINNER</span>}
                            </td>
                            <td className="text-right px-2 py-1.5">{b.sent}</td>
                            <td className="text-right px-2 py-1.5">{pct(b.opened, b.sent)}%</td>
                            <td className="text-right px-2 py-1.5">{pct(b.clicked, b.sent)}%</td>
                            <td className="text-right px-3 py-1.5 font-semibold">{pct(b.converted, b.sent)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!winner && (A.sent < 100 || B.sent < 100) && (
                    <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/30">
                      Need ≥ 100 sends per variant for a stat-sig winner.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 py-2 text-xs text-muted-foreground">
        Showing {filtered.length} of {events.length}
      </div>

      <ul className="divide-y divide-border">
        {filtered.map((e) => {
          const Icon = e.status === "sent" ? CheckCircle2 : e.status === "failed" ? AlertCircle : Clock;
          const colour = e.status === "sent" ? "text-primary" : e.status === "failed" ? "text-destructive" : "text-muted-foreground";
          return (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 ${colour}`} size={18} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-sm">{e.email_type}</span>
                    {e.variant && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{e.variant}</span>
                    )}
                    <span className="text-xs text-muted-foreground">→ {e.recipient_email}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(e.created_at).toLocaleString()} · {e.status}
                    {e.provider_message_id && <> · id {e.provider_message_id.slice(0, 12)}…</>}
                  </div>
                  <div className="text-xs mt-1 flex flex-wrap gap-1.5">
                    {e.opened_at && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">opened</span>}
                    {e.clicked_at && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">clicked{e.clicked_cta ? ` · ${e.clicked_cta}` : ''}</span>}
                    {e.converted && <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground">converted</span>}
                  </div>
                  {e.error_message && (
                    <div className="text-xs text-destructive mt-1 break-words">{e.error_message}</div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {!loading && filtered.length === 0 && (
          <li className="px-4 py-12 text-center text-muted-foreground text-sm">No events match these filters.</li>
        )}
      </ul>
      </>}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-foreground mt-0.5">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
