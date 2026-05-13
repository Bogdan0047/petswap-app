import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAvailability, saveAvailability, nextDays } from '@/lib/availability';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/friendlyError';

interface AvailabilityPickerProps {
  userId: string | null | undefined;
}

const AvailabilityPicker = ({ userId }: AvailabilityPickerProps) => {
  const { rows, loading, refresh } = useAvailability(userId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const days = useMemo(() => nextDays(14), []);

  useEffect(() => {
    setSelected(new Set(rows.map(r => r.date)));
  }, [rows]);

  const toggle = (iso: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(iso) ? next.delete(iso) : next.add(iso);
      return next;
    });
  };

  const onSave = async () => {
    if (!userId) {
      toast.error('Please sign in to save your availability.');
      return;
    }
    setSaving(true);
    try {
      const dates = [...selected].map(iso => new Date(iso));
      await saveAvailability(dates);
      toast.success('Availability updated');
      await refresh();
    } catch (e) {
      toast.error(friendlyError(e, "availability"));
    } finally {
      setSaving(false);
    }
  };

  const dirty = useMemo(() => {
    const original = new Set(rows.map(r => r.date));
    if (original.size !== selected.size) return true;
    for (const v of selected) if (!original.has(v)) return true;
    return false;
  }, [rows, selected]);

  if (!userId) {
    return (
      <div className="card-flat p-5">
        <p className="text-[13px] text-muted-foreground">
          Sign in to set the days you're free to help nearby owners. Available helpers appear higher in matches.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-[15px]">Tap days you're free to help</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Active availability boosts you in nearby matches.
          </p>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {days.map(d => {
          const active = selected.has(d.iso);
          const isToday = d.iso === new Date().toISOString().slice(0, 10);
          return (
            <button
              key={d.iso}
              onClick={() => toggle(d.iso)}
              className={cn(
                'flex flex-col items-center justify-center rounded-md py-2 transition-all duration-fast active:scale-[0.95] relative',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-foreground/80',
              )}
            >
              <span className="text-[10px] font-medium uppercase opacity-80">{d.weekday}</span>
              <span className="text-[14px] font-bold leading-tight">{d.date.getDate()}</span>
              {isToday && !active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
              {active && <Check size={10} className="absolute top-1 right-1 opacity-90" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className={cn(
          'btn-primary w-full text-[14px] py-2.5',
          (!dirty || saving) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {saving ? 'Saving…' : dirty ? `Save ${selected.size} day${selected.size === 1 ? '' : 's'}` : 'Saved'}
      </button>
    </div>
  );
};

export default AvailabilityPicker;
