// Admin: cross-channel communication timeline.
// Shows recent communication_events with the push→email→action chain.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CommEventRow {
  id: string;
  user_id: string;
  event_type: string;
  source_event_id: string | null;
  primary_channel: string;
  fallback_channel: string | null;
  fallback_after_minutes: number | null;
  fallback_dispatched_at: string | null;
  sent_push_at: string | null;
  opened_push_at: string | null;
  sent_email_at: string | null;
  opened_email_at: string | null;
  converted: boolean;
  conversion_type: string | null;
  converted_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

const fmtTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Step = ({ label, time, ok }: { label: string; time: string | null; ok?: boolean }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className={`h-2 w-2 rounded-full ${time ? (ok ? 'bg-primary' : 'bg-muted-foreground') : 'bg-border'}`} />
    <span className="font-medium">{label}</span>
    <span className="text-muted-foreground">{fmtTime(time)}</span>
  </div>
);

const AdminCommunicationTimeline = () => {
  const [rows, setRows] = useState<CommEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterUser, setFilterUser] = useState('');

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('communication_events' as never)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (filterUser.trim()) q = q.eq('user_id', filterUser.trim()) as typeof q;
    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error('Load failed', { description: error.message }); return; }
    setRows((data ?? []) as unknown as CommEventRow[]);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const runFallbackDrain = async () => {
    const { error } = await supabase.functions.invoke('comm-fallback-drain', {});
    if (error) { toast.error('Drain failed', { description: error.message }); return; }
    toast.success('Fallback drain executed');
    void load();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Communication Timeline</h2>
          <p className="text-xs text-muted-foreground">
            Push → email fallback → conversion across all channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by user_id"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs"
          />
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={() => void runFallbackDrain()}>
            Run fallback drain
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No communication events yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{r.event_type}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {r.user_id.slice(0, 8)}… · {r.source_event_id?.slice(0, 8) ?? '—'}
                  </span>
                </div>
                {r.converted ? (
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    converted · {r.conversion_type}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">pending</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Step label="Push sent" time={r.sent_push_at} ok />
                <Step label="Push opened" time={r.opened_push_at} ok />
                <Step label="Email sent" time={r.sent_email_at} ok />
                <Step label="Email opened" time={r.opened_email_at} ok />
              </div>
              {r.fallback_channel === 'email' && r.fallback_after_minutes && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Email fallback after {r.fallback_after_minutes}m
                  {r.fallback_dispatched_at ? ` · dispatched ${fmtTime(r.fallback_dispatched_at)}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCommunicationTimeline;
