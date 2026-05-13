import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { toast } from 'sonner';
import { sendPush } from '@/lib/sendPush';

interface Row {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  metadata: { id_image_path?: string; selfie_path?: string };
  profile?: { first_name: string | null; email: string | null; area: string | null };
  idUrl?: string;
  selfieUrl?: string;
}

const sign = async (path?: string) => {
  if (!path) return undefined;
  const { data } = await supabase.storage.from('verifications').createSignedUrl(path, 600);
  return data?.signedUrl;
};

const AdminVerifications = () => {
  const navigate = useNavigate();
  const userId = useCurrentUserId();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    if (userId === null) {
      const t = setTimeout(() => setAuthResolved(true), 600);
      return () => clearTimeout(t);
    }
    setAuthResolved(true);
    supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('verifications')
      .select('id,user_id,status,created_at,metadata')
      .eq('verification_type', 'id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    const list = (data ?? []) as Row[];
    if (list.length === 0) { setRows([]); setLoading(false); return; }

    const userIds = list.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,first_name,email,area')
      .in('id', userIds);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const enriched = await Promise.all(
      list.map(async (r) => ({
        ...r,
        profile: byId.get(r.user_id) as Row['profile'],
        idUrl: await sign(r.metadata?.id_image_path),
        selfieUrl: await sign(r.metadata?.selfie_path),
      })),
    );
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) void load();
    else if (authResolved) setLoading(false);
  }, [isAdmin, authResolved]);

  const review = async (id: string, approve: boolean) => {
    setWorking(id);
    const row = rows.find((r) => r.id === id);
    const { error } = await supabase.rpc('review_id_verification', {
      _verification_id: id,
      _approve: approve,
    });
    setWorking(null);
    if (error) {
      toast.error('Action failed', { description: error.message });
      return;
    }
    toast.success(approve ? 'Approved' : 'Rejected');
    if (approve && row?.user_id) {
      void sendPush({
        userId: row.user_id,
        type: 'verification',
        title: 'You\'re verified ✓',
        body: 'Your ID has been approved. You\'ll now appear as a trusted member.',
        deepLink: '/profile',
        idempotencyKey: `verification-approved:${id}`,
        sourceEventId: id,
      });
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (!authResolved) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <ShieldCheck size={32} className="text-muted-foreground mb-3" />
        <p className="font-semibold">Admin access only</p>
        <button onClick={() => navigate('/profile')} className="btn-primary mt-4">Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-md border-b border-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold">ID verification queue</h1>
          <p className="text-[11px] text-muted-foreground">{rows.length} pending</p>
        </div>
      </header>

      <div className="px-5 pt-4 max-w-2xl mx-auto space-y-4">
        {loading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>}
        {!loading && rows.length === 0 && (
          <div className="text-center py-16">
            <ShieldCheck size={28} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-[14px] text-muted-foreground">No pending verifications.</p>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="card-elevated p-4">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-semibold text-[14px]">{r.profile?.first_name ?? 'Unknown'}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-GB')}</p>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">
              {r.profile?.email} {r.profile?.area && `· ${r.profile.area}`}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Photo url={r.idUrl} label="Government ID" />
              <Photo url={r.selfieUrl} label="Selfie" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => review(r.id, false)}
                disabled={working === r.id}
                className="flex-1 btn-outline py-2.5 text-[13px] inline-flex items-center justify-center gap-1.5 text-destructive border-destructive/30"
              >
                <X size={15} /> Reject
              </button>
              <button
                onClick={() => review(r.id, true)}
                disabled={working === r.id}
                className="flex-1 btn-primary py-2.5 text-[13px] inline-flex items-center justify-center gap-1.5"
              >
                {working === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Photo = ({ url, label }: { url?: string; label: string }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
    <div className="aspect-[4/3] rounded-lg bg-muted overflow-hidden">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} className="w-full h-full object-cover" />
        </a>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">No image</div>
      )}
    </div>
  </div>
);

export default AdminVerifications;
