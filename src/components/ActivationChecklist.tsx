import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useMyProfile } from '@/hooks/useMyProfile';
import { haptic } from '@/lib/haptic';

interface Props {
  userId: string | undefined | null;
}

const DISMISS_KEY = (uid: string) => `petswap.activation.dismissed.${uid}`;

export default function ActivationChecklist({ userId }: Props) {
  const navigate = useNavigate();
  const { isActive, subscription } = useSubscription();
  const { profile, pets } = useMyProfile(userId);
  const [hasAvailability, setHasAvailability] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Local dismiss
  useEffect(() => {
    if (!userId) return;
    setDismissed(localStorage.getItem(DISMISS_KEY(userId)) === '1');
  }, [userId]);

  // Availability check (lightweight)
  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    (async () => {
      const { count } = await supabase
        .from('availability')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (!cancel) setHasAvailability((count ?? 0) > 0);
    })();
    return () => { cancel = true; };
  }, [userId]);

  const items = useMemo(() => {
    const hasPhoto = pets.length > 0; // approximation — at least one pet means added
    const hasLocation = !!(profile?.latitude && profile?.longitude) || !!profile?.postcode;
    const hasBio = !!profile?.bio && profile.bio.trim().length > 20;
    return [
      { key: 'pet', label: 'Add your pet', done: pets.length > 0, action: () => navigate('/edit-profile') },
      { key: 'photo', label: 'Upload pet photos', done: hasPhoto, action: () => navigate('/edit-profile') },
      { key: 'avail', label: 'Add availability', done: hasAvailability === true, action: () => navigate('/edit-profile') },
      { key: 'loc', label: 'Set location', done: hasLocation, action: () => navigate('/edit-profile') },
      { key: 'bio', label: 'Write a short bio', done: hasBio, action: () => navigate('/edit-profile') },
    ];
  }, [pets.length, profile, hasAvailability, navigate]);

  // Show only if subscribed AND end is within ~31 days (i.e. fresh) AND not 100% AND not dismissed.
  // We don't have current_period_start in the row, so use end and assume the subscription is "new"
  // for the first 36h after being created.
  const sub = subscription as (typeof subscription & { created_at?: string }) | null;
  const createdMs = sub?.created_at ? new Date(sub.created_at).getTime() : 0;
  const within24h = createdMs > 0 ? Date.now() - createdMs < 36 * 60 * 60_000 : true;

  const completed = items.filter(i => i.done).length;
  const pct = Math.round((completed / items.length) * 100);

  if (!userId || !isActive || !within24h || pct === 100 || dismissed) return null;

  const handleDismiss = () => {
    if (!userId) return;
    localStorage.setItem(DISMISS_KEY(userId), '1');
    setDismissed(true);
  };

  return (
    <div className="px-6 mt-4">
      <div
        className="bg-white"
        style={{
          borderRadius: 22,
          border: '1px solid #E8ECF2',
          padding: 18,
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Get started</p>
              <p className="font-semibold text-[15px] leading-tight text-foreground">
                Set up your account
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-1.5 -m-1.5 rounded-full text-muted-foreground active:bg-muted/60"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-foreground">{completed}/{items.length}</span>
        </div>

        {/* Items */}
        <div className="space-y-1">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => { haptic('light'); it.action(); }}
              disabled={it.done}
              className="w-full flex items-center gap-3 py-2 text-left"
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: it.done ? '#0B8F6A' : '#F1F5F9',
                  border: it.done ? 'none' : '1.5px solid #E2E8F0',
                }}
              >
                {it.done && <Check size={13} strokeWidth={3} className="text-white" />}
              </div>
              <span
                className={
                  it.done
                    ? 'text-[14px] text-muted-foreground line-through'
                    : 'text-[14px] text-foreground font-medium'
                }
              >
                {it.label}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-3 text-[12px] text-muted-foreground text-center">
          Complete this to unlock faster matches.
        </p>
      </div>
    </div>
  );
}
