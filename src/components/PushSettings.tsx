import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/friendlyError';
import {
  isPushSupported,
  pushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushClient';

type Prefs = {
  matches: boolean;
  messages: boolean;
  bookings: boolean;
  reviews: boolean;
  verification: boolean;
  safety: boolean;
  marketing: boolean;
  quiet_hours_enabled: boolean;
};

const DEFAULTS: Prefs = {
  matches: true, messages: true, bookings: true, reviews: true,
  verification: true, safety: true, marketing: false, quiet_hours_enabled: true,
};

const ROWS: { key: keyof Prefs; label: string; help: string }[] = [
  { key: 'matches', label: 'New matches', help: 'When someone wants to connect.' },
  { key: 'messages', label: 'Messages', help: 'New chat messages.' },
  { key: 'bookings', label: 'Booking updates', help: 'Confirmations and reminders.' },
  { key: 'reviews', label: 'Review requests', help: 'After a swap completes.' },
  { key: 'verification', label: 'Verification & trust', help: 'Approval updates.' },
  { key: 'safety', label: 'Safety alerts', help: 'Important account safety messages.' },
  { key: 'marketing', label: 'Tips & re-engagement', help: 'Occasional helpful nudges.' },
  { key: 'quiet_hours_enabled', label: 'Quiet hours (9pm–8am)', help: 'Mute non-critical pushes overnight.' },
];

const PushSettings = () => {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPerm(pushPermission());
    void (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { setLoading(false); return; }
      const { data } = await supabase
        .from('notification_preferences').select('*').eq('user_id', ud.user.id).maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...(data as Partial<Prefs>) });
      setLoading(false);
    })();
  }, []);

  const togglePref = async (key: keyof Prefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    const { data: ud } = await supabase.auth.getUser();
    if (!ud.user) return;
    const next = { ...prefs, [key]: value, user_id: ud.user.id };
    await supabase.from('notification_preferences').upsert(next, { onConflict: 'user_id' });
  };

  const enablePush = async () => {
    setBusy(true);
    const r = await subscribeToPush();
    setBusy(false);
    setPerm(pushPermission());
    if (r.ok) toast.success('Push notifications enabled');
    else toast.error(friendlyError(r.reason, "push"));
  };

  const disablePush = async () => {
    setBusy(true);
    await unsubscribeFromPush();
    setBusy(false);
    setPerm(pushPermission());
    toast('Push notifications disabled');
  };

  if (!isPushSupported()) {
    return <p className="text-sm text-muted-foreground">Push notifications aren't supported on this device.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-medium flex items-center gap-2">
            {perm === 'granted' ? <Bell size={18} className="text-primary" /> : <BellOff size={18} className="text-muted-foreground" />}
            Browser push
          </div>
          <p className="text-sm text-muted-foreground">
            {perm === 'granted' ? 'Enabled on this device.' : perm === 'denied' ? 'Blocked in browser settings.' : 'Off — enable to get instant alerts.'}
          </p>
        </div>
        {perm === 'granted'
          ? <Button variant="outline" size="sm" onClick={disablePush} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={14} /> : 'Disable'}</Button>
          : <Button size="sm" onClick={enablePush} disabled={busy || perm === 'denied'}>{busy ? <Loader2 className="animate-spin" size={14} /> : 'Enable'}</Button>}
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {ROWS.map((row) => (
          <label key={row.key} className="flex items-center justify-between gap-3 p-4 cursor-pointer">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{row.label}</div>
              <div className="text-xs text-muted-foreground">{row.help}</div>
            </div>
            <Switch checked={prefs[row.key]} onCheckedChange={(v) => togglePref(row.key, v)} disabled={loading} />
          </label>
        ))}
      </div>
    </div>
  );
};

export default PushSettings;
