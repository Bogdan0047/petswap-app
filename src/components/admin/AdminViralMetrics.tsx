import { useEffect, useState } from 'react';
import { Share2, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ViralMetrics {
  days: number;
  invites: number;
  signups: number;
  credited: number;
  conversion_rate: number;
  top_inviters: Array<{
    inviter_id: string;
    first_name: string | null;
    referral_code: string | null;
    credited: number;
    total: number;
  }>;
}

const RANGES = [7, 30, 90] as const;

/**
 * Phase 3 admin viral metrics. Reads from get_viral_metrics(_days) RPC,
 * which is admin-gated server-side.
 */
export default function AdminViralMetrics() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<ViralMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.rpc('get_viral_metrics', { _days: days }).then(({ data: d, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (error || !d) { setData(null); return; }
      setData(d as unknown as ViralMetrics);
    });
    return () => { cancelled = true; };
  }, [days]);

  return (
    <section className="bg-card rounded-2xl p-5 border border-border space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-primary" />
          <h2 className="font-semibold text-base">Viral metrics</h2>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`text-[11.5px] px-2.5 py-1 rounded-full font-semibold ${
                days === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="text-[12px] text-muted-foreground">No data yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Invites" value={data.invites} />
            <Stat label="Signups" value={data.signups} />
            <Stat label="Credited" value={data.credited} />
            <Stat label="Conv %" value={`${data.conversion_rate}%`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={12} className="text-primary" />
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Top inviters
              </p>
            </div>
            {data.top_inviters.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No referrals yet.</p>
            ) : (
              <div className="space-y-1">
                {data.top_inviters.map((t) => (
                  <div key={t.inviter_id} className="flex items-center justify-between text-[12.5px] p-2 rounded-lg bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">
                        {t.first_name ?? 'Anonymous'}{' '}
                        {t.referral_code && (
                          <span className="font-mono text-[11px] text-muted-foreground">· {t.referral_code}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground shrink-0">
                      <span className="text-success font-semibold">{t.credited}</span> / {t.total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/30 p-2.5 text-center">
      <div className="font-bold text-[16px]">{value}</div>
      <div className="text-[10.5px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
