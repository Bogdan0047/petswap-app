import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Loader2, CheckCircle2, Eye, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  category: string;
  description: string;
  status: ReportStatus;
  created_at: string;
  swap_id: string | null;
}

const statusMeta: Record<ReportStatus, { label: string; bg: string; text: string; icon: typeof Clock }> = {
  open: { label: 'Open', bg: 'bg-warning/10', text: 'text-warning', icon: Clock },
  under_review: { label: 'Under review', bg: 'bg-info/10', text: 'text-info', icon: Eye },
  resolved: { label: 'Resolved', bg: 'bg-primary/10', text: 'text-primary', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', bg: 'bg-muted', text: 'text-muted-foreground', icon: XCircle },
};

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
};

const shortId = (id: string) => id.slice(0, 8);

const AdminReports = () => {
  const navigate = useNavigate();
  const userId = useCurrentUserId();
  const [authResolved, setAuthResolved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('open');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (userId === null) {
      // wait for resolution; useCurrentUserId hook starts as null but updates after getUser resolves
      const timer = setTimeout(() => { if (!cancelled) setAuthResolved(true); }, 600);
      return () => { cancelled = true; clearTimeout(timer); };
    }
    setAuthResolved(true);
    supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' })
      .then(({ data }) => { if (!cancelled) setIsAdmin(Boolean(data)); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('reports')
      .select('id, reporter_id, reported_user_id, category, description, status, created_at, swap_id')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(error.message);
        else setReports((data ?? []) as Report[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const filtered = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter],
  );

  const updateStatus = async (id: string, status: ReportStatus) => {
    setUpdatingId(id);
    const isFinal = status === 'resolved' || status === 'dismissed';
    const patch = {
      status,
      ...(isFinal ? { resolved_at: new Date().toISOString(), resolved_by: userId ?? undefined } : {}),
    };
    const { error } = await supabase.from('reports').update(patch).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Marked as ${statusMeta[status].label.toLowerCase()}`);
    }
    setUpdatingId(null);
  };

  // Gates
  if (!authResolved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
        <ShieldAlert size={32} className="text-muted-foreground mb-3" />
        <p className="font-bold text-[18px]">Sign in required</p>
        <p className="text-[13px] text-muted-foreground mt-1">Admin tools are only available to signed-in administrators.</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-6 text-[14px]">Go home</button>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
        <ShieldAlert size={32} className="text-destructive mb-3" />
        <p className="font-bold text-[18px]">Access denied</p>
        <p className="text-[13px] text-muted-foreground mt-1">This area is restricted to PetSwap admins.</p>
        <button onClick={() => navigate('/home')} className="btn-primary mt-6 text-[14px]">Back to app</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="px-6 pt-6 pb-2 safe-top flex items-center gap-4">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1"><ArrowLeft size={24} /></button>
        <h1 className="font-bold text-[18px]">Reports queue</h1>
      </div>

      {/* Filters */}
      <div className="px-6 mt-3 mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {(['open', 'under_review', 'resolved', 'dismissed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors',
              filter === f ? 'bg-foreground text-background' : 'bg-surface-muted text-foreground/70',
            )}
          >
            {f === 'all' ? 'All' : statusMeta[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-[14px] text-muted-foreground">No reports in this view.</p>
        </div>
      ) : (
        <div className="px-6 space-y-3">
          {filtered.map((r) => {
            const meta = statusMeta[r.status] ?? statusMeta.open;
            const StatusIcon = meta.icon;
            return (
              <div key={r.id} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{r.category.replace(/_/g, ' ')}</span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', meta.bg, meta.text)}>
                        <StatusIcon size={11} /> {meta.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-1 tabular-nums">{fmt(r.created_at)}</p>
                  </div>
                </div>
                <p className="text-[14px] leading-relaxed mb-3 whitespace-pre-wrap">{r.description}</p>
                <div className="grid grid-cols-2 gap-3 text-[12px] mb-4">
                  <div className="card-flat p-3">
                    <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Reporter</p>
                    <p className="font-mono mt-1">{shortId(r.reporter_id)}</p>
                  </div>
                  <div className="card-flat p-3">
                    <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Reported</p>
                    <p className="font-mono mt-1">{shortId(r.reported_user_id)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['under_review', 'resolved', 'dismissed'] as ReportStatus[])
                    .filter((s) => s !== r.status)
                    .map((s) => {
                      const m = statusMeta[s];
                      return (
                        <button
                          key={s}
                          disabled={updatingId === r.id}
                          onClick={() => updateStatus(r.id, s)}
                          className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors', m.bg, m.text, updatingId === r.id && 'opacity-60')}
                        >
                          {updatingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <m.icon size={12} />}
                          Mark {m.label.toLowerCase()}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
