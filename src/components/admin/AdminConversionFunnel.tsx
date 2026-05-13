import { useEffect, useState } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FunnelRow {
  matches: number;
  chats_started: number;
  proposals_opened: number;
  requests_sent: number;
  confirmed: number;
  avg_match_to_booking_hours: number | null;
}

const STAGES: Array<{ key: keyof FunnelRow; label: string }> = [
  { key: 'matches', label: 'Match created' },
  { key: 'chats_started', label: 'Chat started' },
  { key: 'proposals_opened', label: 'Proposal opened' },
  { key: 'requests_sent', label: 'Booking request sent' },
  { key: 'confirmed', label: 'Booking confirmed' },
];

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

const AdminConversionFunnel = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<FunnelRow | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (d: number) => {
    setLoading(true);
    const { data: row, error } = await supabase.rpc('get_conversion_funnel' as never, {
      _days: d,
    } as never);
    setLoading(false);
    if (error) {
      console.error('[funnel] load failed', error);
      setData(null);
      return;
    }
    const rowAny = row as unknown;
    const r = (Array.isArray(rowAny) ? rowAny[0] : rowAny) as Record<string, unknown> | null;
    setData(
      r
        ? {
            matches: Number(r.matches ?? 0),
            chats_started: Number(r.chats_started ?? 0),
            proposals_opened: Number(r.proposals_opened ?? 0),
            requests_sent: Number(r.requests_sent ?? 0),
            confirmed: Number(r.confirmed ?? 0),
            avg_match_to_booking_hours:
              r.avg_match_to_booking_hours == null
                ? null
                : Number(r.avg_match_to_booking_hours),
          }
        : null,
    );
  };

  useEffect(() => {
    void load(days);
  }, [days]);

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-[15px]">Booking conversion funnel</h3>
          <p className="text-[12px] text-muted-foreground">
            Match → Chat → Proposal → Request → Confirmed
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${
                days === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/70'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="text-[12.5px] text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-1.5">
          {STAGES.map((s, i) => {
            const value = (data[s.key] as number) ?? 0;
            const prev = i === 0 ? value : ((data[STAGES[i - 1].key] as number) ?? 0);
            const fromTop = pct(value, data.matches || 0);
            const stepDrop = i === 0 ? null : pct(prev - value, prev || 0);
            return (
              <div key={s.key}>
                {i > 0 && (
                  <div className="flex items-center gap-2 px-2 py-0.5 text-[10.5px] text-muted-foreground">
                    <ArrowDown size={10} />
                    <span>
                      {stepDrop !== null && stepDrop > 0
                        ? `${stepDrop.toFixed(1)}% drop-off`
                        : 'No drop-off'}
                    </span>
                  </div>
                )}
                <div className="rounded-md bg-muted/60 px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fromTop.toFixed(1)}% of matches
                    </p>
                  </div>
                  <p className="text-[18px] font-bold tabular-nums">{value}</p>
                </div>
              </div>
            );
          })}

          <div className="pt-3 mt-2 border-t border-border flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">Avg time match → confirmed</p>
            <p className="text-[14px] font-bold">
              {data.avg_match_to_booking_hours == null
                ? '—'
                : `${data.avg_match_to_booking_hours.toFixed(1)}h`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminConversionFunnel;
