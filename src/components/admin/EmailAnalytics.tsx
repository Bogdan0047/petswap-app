import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Trophy, Clock, Calendar, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RangeKey = "7d" | "30d";

interface EmailEvent {
  id: string;
  user_id: string | null;
  email_type: string;
  recipient_email: string;
  status: string;
  variant: string | null;
  clicked_cta: string | null;
  conversion_type: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  converted: boolean;
  converted_at: string | null;
  created_at: string;
}

type Bucket = { sent: number; opened: number; clicked: number; converted: number };
const empty = (): Bucket => ({ sent: 0, opened: 0, clicked: 0, converted: 0 });
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

function rangeStart(range: RangeKey, now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - (range === "7d" ? 7 : 30));
  return d;
}

function aggregate(events: EmailEvent[]): Bucket {
  const b = empty();
  for (const e of events) {
    if (e.status !== "sent") continue;
    b.sent++;
    if (e.opened_at) b.opened++;
    if (e.clicked_at) b.clicked++;
    if (e.converted) b.converted++;
  }
  return b;
}

function trend(curr: number, prev: number): { dir: "up" | "down" | "flat"; deltaPct: number } {
  if (prev === 0 && curr === 0) return { dir: "flat", deltaPct: 0 };
  if (prev === 0) return { dir: "up", deltaPct: 100 };
  const delta = ((curr - prev) / prev) * 100;
  if (Math.abs(delta) < 1) return { dir: "flat", deltaPct: 0 };
  return { dir: delta > 0 ? "up" : "down", deltaPct: Math.round(Math.abs(delta)) };
}

function isStatSigWinner(a: Bucket, b: Bucket, min = 100): "A" | "B" | null {
  if (a.sent < min || b.sent < min) return null;
  const pa = a.converted / a.sent;
  const pb = b.converted / b.sent;
  const p = (a.converted + b.converted) / (a.sent + b.sent);
  const se = Math.sqrt(p * (1 - p) * (1 / a.sent + 1 / b.sent));
  if (se === 0) return null;
  const z = (pb - pa) / se;
  if (z >= 1.96) return "B";
  if (z <= -1.96) return "A";
  return null;
}

export default function EmailAnalytics() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [prevEvents, setPrevEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userQuery, setUserQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const start = rangeStart(range, now);
    const prevStart = rangeStart(range, start);
    const { data } = await supabase
      .from("email_events")
      .select("*")
      .gte("created_at", prevStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    const all = (data as EmailEvent[]) || [];
    setEvents(all.filter((e) => new Date(e.created_at) >= start));
    setPrevEvents(all.filter((e) => new Date(e.created_at) < start && new Date(e.created_at) >= prevStart));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [range]);
  useEffect(() => {
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [range]);

  const curr = useMemo(() => aggregate(events), [events]);
  const prev = useMemo(() => aggregate(prevEvents), [prevEvents]);

  const cards = [
    { label: "Sent", value: curr.sent, prev: prev.sent, fmt: (v: number) => String(v) },
    { label: "Open rate", value: pct(curr.opened, curr.sent), prev: pct(prev.opened, prev.sent), fmt: (v: number) => `${v}%` },
    { label: "Click rate", value: pct(curr.clicked, curr.sent), prev: pct(prev.clicked, prev.sent), fmt: (v: number) => `${v}%` },
    { label: "Conversion", value: pct(curr.converted, curr.sent), prev: pct(prev.converted, prev.sent), fmt: (v: number) => `${v}%` },
    { label: "Bookings", value: events.filter((e) => e.converted && e.clicked_cta === "confirm_booking").length, prev: prevEvents.filter((e) => e.converted && e.clicked_cta === "confirm_booking").length, fmt: (v: number) => String(v) },
  ];

  // Funnel per email type
  const funnelByType = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const e of events) {
      if (e.status !== "sent") continue;
      let b = map.get(e.email_type);
      if (!b) { b = empty(); map.set(e.email_type, b); }
      b.sent++;
      if (e.opened_at) b.opened++;
      if (e.clicked_at) b.clicked++;
      if (e.converted) b.converted++;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].sent - a[1].sent);
  }, [events]);

  // A/B by type
  const abByType = useMemo(() => {
    const map = new Map<string, { A: Bucket; B: Bucket }>();
    for (const e of events) {
      if (e.status !== "sent") continue;
      if (e.variant !== "A" && e.variant !== "B") continue;
      let entry = map.get(e.email_type);
      if (!entry) { entry = { A: empty(), B: empty() }; map.set(e.email_type, entry); }
      const b = entry[e.variant];
      b.sent++;
      if (e.opened_at) b.opened++;
      if (e.clicked_at) b.clicked++;
      if (e.converted) b.converted++;
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  // Ranking
  const ranking = useMemo(() => {
    return funnelByType
      .map(([type, b]) => ({ type, sent: b.sent, convPct: pct(b.converted, b.sent), clickPct: pct(b.clicked, b.sent), converted: b.converted }))
      .sort((a, b) => b.convPct - a.convPct || b.clickPct - a.clickPct);
  }, [funnelByType]);

  // Behaviour
  const behaviour = useMemo(() => {
    const sent = events.filter((e) => e.status === "sent");
    const clickTimes: number[] = [];
    const bookingTimes: number[] = [];
    let neverOpened = 0;
    let openedNoClick = 0;
    for (const e of sent) {
      if (!e.opened_at) neverOpened++;
      if (e.opened_at && !e.clicked_at) openedNoClick++;
      if (e.sent_at && e.clicked_at) clickTimes.push((+new Date(e.clicked_at) - +new Date(e.sent_at)) / 60000);
      if (e.sent_at && e.converted_at && e.clicked_cta === "confirm_booking") {
        bookingTimes.push((+new Date(e.converted_at) - +new Date(e.sent_at)) / 3600000);
      }
    }
    const avg = (a: number[]) => (a.length === 0 ? 0 : Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10);
    return {
      avgClickMin: avg(clickTimes),
      avgBookingHr: avg(bookingTimes),
      neverOpenedPct: pct(neverOpened, sent.length),
      openedNoClickPct: pct(openedNoClick, sent.length),
    };
  }, [events]);

  // Drop-off insights
  const insights = useMemo(() => {
    const out: { level: "warn" | "alert"; msg: string }[] = [];
    for (const [type, b] of funnelByType) {
      if (b.sent < 20) continue;
      const op = pct(b.opened, b.sent);
      const cl = pct(b.clicked, b.opened);
      const cv = pct(b.converted, b.clicked);
      if (op >= 40 && cl < 15) out.push({ level: "warn", msg: `${type}: high opens (${op}%) but low clicks (${cl}%) — improve CTA.` });
      if (op < 20) out.push({ level: "warn", msg: `${type}: low open rate (${op}%) — test subject line.` });
      if (cl >= 30 && cv < 15) out.push({ level: "warn", msg: `${type}: high clicks (${cl}%) but low conversion (${cv}%) — check in-app UX.` });
    }
    // global drop alert
    const currConv = pct(curr.converted, curr.sent);
    const prevConv = pct(prev.converted, prev.sent);
    if (prevConv > 0 && currConv < prevConv * 0.8) {
      out.push({ level: "alert", msg: `Booking conversion dropped ${Math.round((1 - currConv / prevConv) * 100)}% vs previous period.` });
    }
    return out;
  }, [funnelByType, curr, prev]);

  // Time-of-day / day-of-week (clicks)
  const timePerf = useMemo(() => {
    const byHour = new Array(24).fill(0);
    const byDow = new Array(7).fill(0);
    for (const e of events) {
      if (!e.clicked_at) continue;
      const d = new Date(e.clicked_at);
      byHour[d.getHours()]++;
      byDow[d.getDay()]++;
    }
    const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const bestHour = byHour.indexOf(Math.max(...byHour));
    const bestDow = byDow.indexOf(Math.max(...byDow));
    return {
      byHour, byDow, dows,
      bestHourLabel: byHour[bestHour] > 0 ? `${bestHour}:00–${bestHour + 1}:00` : "—",
      bestDowLabel: byDow[bestDow] > 0 ? dows[bestDow] : "—",
    };
  }, [events]);

  // User timeline
  const userTimeline = useMemo(() => {
    if (!userQuery.trim()) return [];
    const q = userQuery.trim().toLowerCase();
    return events
      .filter((e) => e.recipient_email.toLowerCase().includes(q) || (e.user_id ?? "").toLowerCase().includes(q))
      .slice(0, 50);
  }, [events, userQuery]);

  return (
    <div className="space-y-5 pb-8">
      {/* Range selector */}
      <div className="px-4 pt-3 flex items-center gap-2">
        <div className="inline-flex rounded-full bg-muted p-0.5">
          {(["7d", "30d"] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Last {r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
        {loading && <span className="text-[11px] text-muted-foreground ml-2">Updating…</span>}
        <span className="ml-auto text-[11px] text-muted-foreground">Auto-refresh 20s</span>
      </div>

      {/* Summary cards */}
      <section className="px-4">
        <SectionTitle>Summary</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {cards.map((c) => {
            const t = trend(c.value, c.prev);
            return (
              <div key={c.label} className="rounded-xl border border-border bg-card px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="text-xl font-semibold mt-0.5">{c.fmt(c.value)}</div>
                <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${t.dir === "up" ? "text-primary" : t.dir === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                  {t.dir === "up" ? <TrendingUp size={12} /> : t.dir === "down" ? <TrendingDown size={12} /> : null}
                  {t.dir === "flat" ? "—" : `${t.deltaPct}% vs prev`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Insights / alerts */}
      {insights.length > 0 && (
        <section className="px-4">
          <SectionTitle>Insights</SectionTitle>
          <div className="space-y-1.5">
            {insights.map((i, idx) => (
              <div key={idx} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${i.level === "alert" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{i.msg}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Funnel */}
      <section className="px-4">
        <SectionTitle>Funnel by email type</SectionTitle>
        <div className="space-y-3">
          {funnelByType.length === 0 && <EmptyHint text="No sends in this period." />}
          {funnelByType.map(([type, b]) => {
            const stages = [
              { label: "Sent", n: b.sent, base: b.sent },
              { label: "Opened", n: b.opened, base: b.sent },
              { label: "Clicked", n: b.clicked, base: b.sent },
              { label: "Converted", n: b.converted, base: b.sent },
            ];
            return (
              <div key={type} className="rounded-xl border border-border bg-card p-3">
                <div className="text-sm font-semibold mb-2">{type}</div>
                <div className="space-y-1.5">
                  {stages.map((s, i) => {
                    const w = s.base === 0 ? 0 : (s.n / s.base) * 100;
                    const dropFromPrev = i === 0 ? 0 : stages[i - 1].n === 0 ? 0 : Math.round((1 - s.n / stages[i - 1].n) * 100);
                    return (
                      <div key={s.label}>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-0.5">
                          <span>{s.label}</span>
                          <span>{s.n.toLocaleString()} · {pct(s.n, s.base)}%{i > 0 && dropFromPrev > 0 && <span className="text-destructive ml-1.5">↓ {dropFromPrev}%</span>}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(2, w)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* A/B */}
      {abByType.length > 0 && (
        <section className="px-4">
          <SectionTitle>A/B test performance</SectionTitle>
          <div className="space-y-3">
            {abByType.map(([type, { A, B }]) => {
              const winner = isStatSigWinner(A, B);
              const rows: ("A" | "B")[] = ["A", "B"];
              return (
                <div key={type} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2 text-sm font-semibold border-b border-border flex items-center gap-2">
                    {type}
                    {winner && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary"><Trophy size={10} /> Variant {winner} winning</span>}
                  </div>
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
                      {rows.map((v) => {
                        const b = v === "A" ? A : B;
                        const isWin = winner === v;
                        const isLose = winner && winner !== v;
                        return (
                          <tr key={v} className={isWin ? "bg-primary/10" : isLose ? "bg-destructive/5" : ""}>
                            <td className="px-3 py-1.5 font-medium">
                              {v}
                              {isWin && <span className="ml-1.5 text-[10px] text-primary font-semibold">🏆 WINNER</span>}
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
                    <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/30">Need ≥ 100 sends per variant for stat-sig winner.</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Ranking */}
      <section className="px-4">
        <SectionTitle>Email performance ranking</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {ranking.length === 0 && <div className="px-3 py-4 text-xs text-muted-foreground text-center">No data.</div>}
          {ranking.map((r, i) => (
            <div key={r.type} className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-0">
              <div className="w-5 text-xs font-semibold text-muted-foreground">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.type}</div>
                <div className="text-[11px] text-muted-foreground">{r.sent} sent · {r.converted} bookings/conversions</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">{r.convPct}%</div>
                <div className="text-[10px] text-muted-foreground">{r.clickPct}% click</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Behaviour */}
      <section className="px-4">
        <SectionTitle>How users behave after emails</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Avg time to click" value={behaviour.avgClickMin > 0 ? `${behaviour.avgClickMin} min` : "—"} icon={<Clock size={12} />} />
          <Stat label="Avg time to booking" value={behaviour.avgBookingHr > 0 ? `${behaviour.avgBookingHr} h` : "—"} icon={<Clock size={12} />} />
          <Stat label="Never opened" value={`${behaviour.neverOpenedPct}%`} />
          <Stat label="Opened, no click" value={`${behaviour.openedNoClickPct}%`} />
        </div>
      </section>

      {/* Time perf */}
      <section className="px-4">
        <SectionTitle>Best send times</SectionTitle>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label="Best hour (clicks)" value={timePerf.bestHourLabel} icon={<Clock size={12} />} />
          <Stat label="Best day (clicks)" value={timePerf.bestDowLabel} icon={<Calendar size={12} />} />
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Clicks by hour</div>
          <div className="flex items-end gap-0.5 h-16">
            {timePerf.byHour.map((n, h) => {
              const max = Math.max(...timePerf.byHour, 1);
              return <div key={h} className="flex-1 bg-primary/70 rounded-sm" style={{ height: `${(n / max) * 100}%` }} title={`${h}:00 — ${n}`} />;
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>
        </div>
      </section>

      {/* User timeline */}
      <section className="px-4">
        <SectionTitle>Per-user timeline</SectionTitle>
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search by email or user id…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background"
          />
        </div>
        {userQuery && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {userTimeline.length === 0 && <div className="px-3 py-4 text-xs text-muted-foreground text-center">No matches.</div>}
            {userTimeline.map((e) => (
              <div key={e.id} className="px-3 py-2 border-b border-border last:border-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium">{e.email_type}</span>
                  {e.variant && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">{e.variant}</span>}
                  <span className="text-[11px] text-muted-foreground">→ {e.recipient_email}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(e.created_at).toLocaleString()}</div>
                <div className="text-[11px] mt-1 flex flex-wrap gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-muted">sent {e.status === "sent" ? "✔" : "✗"}</span>
                  {e.opened_at && <span className="px-1.5 py-0.5 rounded bg-muted">opened ✔</span>}
                  {e.clicked_at && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">clicked ✔{e.clicked_cta ? ` · ${e.clicked_cta}` : ""}</span>}
                  {e.converted && <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground">converted ✔</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{children}</div>;
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="text-xs text-muted-foreground text-center py-4">{text}</div>;
}
