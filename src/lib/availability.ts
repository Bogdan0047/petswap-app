import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Slot = 'morning' | 'afternoon' | 'evening' | 'all_day';

export interface AvailabilityRow {
  id: string;
  user_id: string;
  date: string; // ISO date
  slot: Slot;
}

/** Fetch a user's future availability dates. */
export const useAvailability = (userId: string | null | undefined) => {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', userId)
      .gte('date', today)
      .order('date', { ascending: true });
    setRows((data ?? []) as AvailabilityRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, refresh };
};

/** Save a list of dates as a single all_day batch for current user. */
export const saveAvailability = async (dates: Date[]): Promise<void> => {
  const isoDates = dates.map(d => d.toISOString().slice(0, 10));
  const { error } = await supabase.rpc('set_availability', {
    _dates: isoDates,
    _slot: 'all_day',
  });
  if (error) throw error;
};

/** Friendly labels for the next 14 days, used by the picker. */
export const nextDays = (count = 14): { date: Date; iso: string; label: string; weekday: string }[] => {
  const out: { date: Date; iso: string; label: string; weekday: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      date: d,
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    });
  }
  return out;
};
