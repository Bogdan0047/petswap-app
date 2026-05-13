import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { sendPush, type PushType } from '@/lib/sendPush';

type Stats = {
  total: number; sent: number; opened: number; clicked: number;
  skipped: number; failed: number; converted: number;
};

const TESTS: { type: PushType; label: string; title: string; body: string; deepLink: string }[] = [
  { type: 'match', label: 'New match', title: "You've got a great match 👀", body: 'Alex is ready to chat. Most swaps start today.', deepLink: '/inbox' },
  { type: 'match', label: 'Match nudge 24h', title: 'Still thinking about Alex?', body: 'They may connect with someone else soon.', deepLink: '/inbox' },
  { type: 'match', label: 'Match nudge 72h', title: 'Last chance to connect 🐾', body: "Don't miss your PetSwap with Alex.", deepLink: '/inbox' },
  { type: 'message', label: 'New message', title: 'New message from Alex', body: 'Alex replied on PetSwap.', deepLink: '/inbox' },
  { type: 'booking_confirmed', label: 'Chat → booking nudge', title: 'Ready to confirm your PetSwap?', body: 'Lock in your dates with Alex before they fill up.', deepLink: '/inbox' },
  { type: 'booking_confirmed', label: 'Booking confirmation', title: 'Your PetSwap is confirmed 🎉', body: "You're all set with Alex. Great choice — most bookings complete successfully.", deepLink: '/inbox' },
  { type: 'booking_reminder', label: 'Booking reminder', title: 'Reminder: your PetSwap starts tomorrow', body: 'Tap to review the details.', deepLink: '/inbox' },
  { type: 'review_request', label: 'Review request', title: 'How was your PetSwap? ⭐', body: 'Reviews help you get more matches next time. Users with reviews get 3× more responses.', deepLink: '/inbox' },
  { type: 'verification', label: 'Verification', title: 'You are now verified', body: 'Your profile just became more trusted.', deepLink: '/profile' },
  { type: 'safety', label: 'Safety', title: 'Important PetSwap safety update', body: 'Please review.', deepLink: '/safety' },
  { type: 'marketing' as PushType, label: 'Winback 7d (simulate inactivity)', title: 'Your next PetSwap is waiting 🐾', body: 'New pet owners are looking for swaps near you.', deepLink: '/home' },
  { type: 'marketing' as PushType, label: 'Winback 14d (simulate inactivity)', title: "Don't miss your next PetSwap", body: 'Come back and find trusted pet care today.', deepLink: '/home' },
  { type: 'marketing' as PushType, label: 'Winback boost 24h', title: 'Still looking for a PetSwap?', body: 'New matches are waiting for you.', deepLink: '/home' },
];

const AdminPushDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('notification_events').select('status').gte('created_at', since);
      const rows = (data ?? []) as { status: string }[];
      setStats({
        total: rows.length,
        sent: rows.filter(r => r.status === 'sent').length,
        opened: 0, clicked: 0,
        skipped: rows.filter(r => r.status === 'skipped').length,
        failed: rows.filter(r => r.status === 'failed').length,
        converted: 0,
      });
      // Open / click / converted counts
      const { data: oc } = await supabase
        .from('notification_events').select('opened_at, clicked_at, converted').gte('created_at', since);
      const ocRows = (oc ?? []) as { opened_at: string | null; clicked_at: string | null; converted: boolean | null }[];
      setStats(s => s ? {
        ...s,
        opened: ocRows.filter(r => !!r.opened_at).length,
        clicked: ocRows.filter(r => !!r.clicked_at).length,
        converted: ocRows.filter(r => !!r.converted).length,
      } : s);
    };
    void load();
  }, []);

  const runTest = async (t: typeof TESTS[number], key?: string) => {
    const busyKey = key ?? t.type;
    setBusyType(busyKey);
    const { data: ud } = await supabase.auth.getUser();
    if (!ud.user) { setBusyType(null); toast.error('Not signed in'); return; }
    const r = await sendPush({
      userId: ud.user.id, type: t.type, title: t.title, body: t.body,
      deepLink: t.deepLink,
      idempotencyKey: `test-${busyKey}-${Date.now()}`,
      bypassGate: true,
    });
    setBusyType(null);
    if (r.ok) toast.success(`Test sent: ${t.label}`);
    else toast.error(`Failed: ${t.label}`, { description: r.reason ?? r.status });
  };

  const cards = [
    { label: 'Sent (7d)', value: stats?.sent ?? '—' },
    { label: 'Opened', value: stats?.opened ?? '—' },
    { label: 'Clicked', value: stats?.clicked ?? '—' },
    { label: 'Converted', value: stats?.converted ?? '—' },
    { label: 'Skipped', value: stats?.skipped ?? '—' },
    { label: 'Failed', value: stats?.failed ?? '—' },
  ];
  const openRate = stats && stats.sent ? Math.round((stats.opened / stats.sent) * 100) : 0;
  const clickRate = stats && stats.sent ? Math.round((stats.clicked / stats.sent) * 100) : 0;
  const convRate = stats && stats.sent ? Math.round((stats.converted / stats.sent) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-semibold mt-1">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="text-sm text-muted-foreground">
        Open rate: <span className="text-foreground font-medium">{openRate}%</span> ·
        Click rate: <span className="text-foreground font-medium ml-1">{clickRate}%</span> ·
        Push → action: <span className="text-foreground font-medium ml-1">{convRate}%</span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="font-medium mb-3">Test sends (to your device)</div>
        <div className="flex flex-wrap gap-2">
          {TESTS.map(t => {
            const key = `${t.type}:${t.label}`;
            return (
              <Button key={key} variant="outline" size="sm" onClick={() => runTest(t, key)} disabled={busyType === key}>
                {busyType === key ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                {t.label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Test sends bypass quiet hours and rate limits. Make sure push is enabled on this device first.
        </p>
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busyType === 'cron-review'}
            onClick={async () => {
              setBusyType('cron-review');
              const { data, error } = await supabase.functions.invoke('push-review-requests', { body: {} });
              setBusyType(null);
              if (error) toast.error('Cron run failed', { description: error.message });
              else toast.success('Review-request cron run', {
                description: `first: ${(data as { first_sent?: number })?.first_sent ?? 0}, reminders: ${(data as { reminders_sent?: number })?.reminders_sent ?? 0}`,
              });
            }}
          >
            {busyType === 'cron-review' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Simulate completed booking → run review cron
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busyType === 'cron-drain'}
            onClick={async () => {
              setBusyType('cron-drain');
              const { data, error } = await supabase.functions.invoke('push-queue-drain', { body: {} });
              setBusyType(null);
              if (error) toast.error('Drain failed', { description: error.message });
              else toast.success('Push queue drained', {
                description: `picked: ${(data as { picked?: number })?.picked ?? 0}, drained: ${(data as { drained?: number })?.drained ?? 0}`,
              });
            }}
          >
            {busyType === 'cron-drain' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Run push queue drain (match nudges)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busyType === 'cron-winback'}
            onClick={async () => {
              setBusyType('cron-winback');
              const { data, error } = await supabase.functions.invoke('push-winback', { body: {} });
              setBusyType(null);
              if (error) toast.error('Winback cron failed', { description: error.message });
              else toast.success('Winback cron run', {
                description: `7d: ${(data as { queued_7d?: number })?.queued_7d ?? 0}, 14d: ${(data as { queued_14d?: number })?.queued_14d ?? 0}, boost: ${(data as { queued_boost?: number })?.queued_boost ?? 0}`,
              });
            }}
          >
            {busyType === 'cron-winback' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Run winback cron (re-engagement)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busyType === 'cron-badges'}
            onClick={async () => {
              setBusyType('cron-badges');
              const { data, error } = await supabase.functions.invoke('badges-recompute', { body: {} });
              setBusyType(null);
              if (error) toast.error('Badges cron failed', { description: error.message });
              else toast.success('Badges recomputed', {
                description: `scanned: ${(data as { scanned?: number })?.scanned ?? 0}, awarded: ${(data as { awarded?: number })?.awarded ?? 0}, pushed: ${(data as { pushed?: number })?.pushed ?? 0}`,
              });
            }}
          >
            {busyType === 'cron-badges' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Recompute badges (simulate unlock)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busyType === 'cron-streak'}
            onClick={async () => {
              setBusyType('cron-streak');
              const { data, error } = await supabase.functions.invoke('push-streak-nudge', { body: {} });
              setBusyType(null);
              if (error) toast.error('Streak cron failed', { description: error.message });
              else toast.success('Streak nudge run', {
                description: `scanned: ${(data as { scanned?: number })?.scanned ?? 0}, queued: ${(data as { queued?: number })?.queued ?? 0}`,
              });
            }}
          >
            {busyType === 'cron-streak' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Run daily streak nudge
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busyType === 'sim-streak'}
            onClick={async () => {
              setBusyType('sim-streak');
              const { error } = await supabase.rpc('record_streak_activity', { _activity: 'admin_simulate' });
              setBusyType(null);
              if (error) toast.error('Streak update failed', { description: error.message });
              else {
                window.dispatchEvent(new CustomEvent('petswap:streak-changed'));
                toast.success('Streak ticked for today');
              }
            }}
          >
            {busyType === 'sim-streak' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Simulate activity → update streak
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPushDashboard;
