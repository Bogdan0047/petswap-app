import { useState } from 'react';
import { Flame, Trophy, Bell, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Admin-only Phase 2 retention controls.
 *
 * Lets staff manually trigger the retention edge functions instead of waiting
 * for the hourly/daily cron. All buttons are idempotent — they call the same
 * functions cron does, which dedupe per (user, day) via idempotency_key.
 */
type Job = 'badges-recompute' | 'push-streak-nudge' | 'push-winback';

const JOB_META: Record<Job, { Icon: typeof Flame; title: string; subtitle: string }> = {
  'badges-recompute': {
    Icon: Trophy,
    title: 'Recompute badges',
    subtitle: 'Awards new badges + sends "you unlocked" pushes.',
  },
  'push-streak-nudge': {
    Icon: Flame,
    title: 'Streak nudge',
    subtitle: "Pushes \"don't break your streak\" to inactive streakers.",
  },
  'push-winback': {
    Icon: Bell,
    title: 'Winback push',
    subtitle: '7-day + 14-day re-engagement pushes for dormant users.',
  },
};

export default function AdminRetentionTools() {
  const [busy, setBusy] = useState<Job | null>(null);
  const [results, setResults] = useState<Partial<Record<Job, unknown>>>({});

  const run = async (job: Job) => {
    setBusy(job);
    try {
      const { data, error } = await supabase.functions.invoke(job, {
        body: { source: 'admin' },
      });
      if (error) {
        toast.error(`${JOB_META[job].title} failed`, { description: error.message });
        return;
      }
      setResults((r) => ({ ...r, [job]: data }));
      toast.success(`${JOB_META[job].title} ran`);
    } catch (err) {
      toast.error(`${JOB_META[job].title} crashed`, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-card rounded-2xl p-5 border border-border space-y-3">
      <div>
        <h2 className="font-semibold text-base">Retention engine</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Manually trigger the cron jobs that keep PetSwap sticky.
        </p>
      </div>

      <div className="grid gap-2">
        {(Object.keys(JOB_META) as Job[]).map((job) => {
          const meta = JOB_META[job];
          const Icon = meta.Icon;
          const result = results[job];
          return (
            <div key={job} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/30">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">{meta.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{meta.subtitle}</div>
                  {result !== undefined && (
                    <div className="text-[11px] text-muted-foreground mt-1 font-mono break-all">
                      {JSON.stringify(result)}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => run(job)}
                disabled={busy !== null}
                className="btn-outline text-[12px] py-1.5 px-3 shrink-0 disabled:opacity-50"
              >
                {busy === job ? <Loader2 size={12} className="animate-spin" /> : 'Run'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
