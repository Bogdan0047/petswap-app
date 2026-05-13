import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, TrendingUp, Zap, AlertTriangle, Loader2 } from "lucide-react";

interface Metrics {
  active_subscribers: number;
  monthly_subscribers: number;
  yearly_subscribers: number;
  mrr_pence: number;
  trialing: number;
  past_due: number;
  canceled_in_window: number;
  boost_purchases_in_window: number;
  paywall_views_in_window: number;
  paywall_subscribes_in_window: number;
  conversion_rate: number;
}

export default function AdminMonetizationMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc("get_monetization_metrics", { _days: days })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("monetization metrics error", error);
          setMetrics(null);
        } else {
          setMetrics(data as unknown as Metrics);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [days]);

  return (
    <section className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-primary" />
          <h2 className="font-bold text-[15px]">Monetization</h2>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-1 rounded-full font-semibold ${
                days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : !metrics ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat
              label="MRR"
              value={`£${(metrics.mrr_pence / 100).toFixed(2)}`}
              icon={<TrendingUp size={14} className="text-success" />}
            />
            <Stat
              label="Active subs"
              value={metrics.active_subscribers.toString()}
              icon={<Crown size={14} className="text-primary" />}
            />
            <Stat label="Monthly" value={metrics.monthly_subscribers.toString()} />
            <Stat label="Yearly" value={metrics.yearly_subscribers.toString()} />
            <Stat
              label="Boosts"
              value={metrics.boost_purchases_in_window.toString()}
              icon={<Zap size={14} className="text-warning" />}
            />
            <Stat
              label="Past due"
              value={metrics.past_due.toString()}
              icon={<AlertTriangle size={14} className="text-warning" />}
            />
          </div>

          <div className="mt-4 p-3 rounded-xl bg-muted/40">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Paywall views</span>
              <span className="font-semibold">{metrics.paywall_views_in_window}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] mt-1">
              <span className="text-muted-foreground">Subscribed from paywall</span>
              <span className="font-semibold">{metrics.paywall_subscribes_in_window}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] mt-1">
              <span className="text-muted-foreground">Conversion rate</span>
              <span className="font-bold text-primary">
                {(metrics.conversion_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px] mt-1">
              <span className="text-muted-foreground">Cancellations ({days}d)</span>
              <span className="font-semibold">{metrics.canceled_in_window}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3 bg-card">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
        {icon} {label}
      </div>
      <p className="text-[18px] font-bold mt-1 text-foreground">{value}</p>
    </div>
  );
}
