import { useEffect, useState } from 'react';

/**
 * Lightweight client-side product analytics. We log an event with a daily
 * bucket so we can compute DAU / WAU and feature-usage rollups for the
 * in-app dashboard without a backend.
 *
 * The buffer is capped at 1000 entries to keep localStorage healthy.
 */

export type AnalyticsEvent =
  | 'app_open'
  | 'request_opened'
  | 'request_sent'
  | 'request_completed'
  | 'helper_accepted'
  | 'booking_completed'
  | 'favourite_added'
  | 'favourite_rebook'
  // Home funnel
  | 'home_cta_tap'
  | 'home_quick_action_tap'
  | 'home_helper_view'
  | 'home_invite_tap'
  | 'home_sticky_cta_tap'
  | 'home_scroll_50'
  | 'home_scroll_90'
  // Revenue funnel
  | 'subscription_view'
  | 'subscription_upgrade_tap'
  | 'subscription_subscribed'
  | 'subscription_restore'
  | 'boost_view'
  | 'boost_activated'
  | 'boost_paywall_open'
  | 'paywall_view'
  | 'paywall_click'
  | 'purchase_started'
  | 'purchase_success'
  | 'pro_mode_enabled'
  | 'pro_mode_disabled'
  // Account lifecycle
  | 'account_delete_reason'
  // First-swap activation
  | 'first_swap_banner_view'
  | 'first_swap_banner_cta'
  | 'first_swap_banner_dismiss'
  | 'first_swap_suggest_open'
  | 'first_swap_suggest_send'
  | 'first_swap_suggest_dismiss'
  | 'first_swap_profile_nudge_tap'
  | 'first_swap_first_reply'
  | 'first_swap_completed_celebrate'
  // Retention
  | 'daily_spark_tap'
  | 'urgency_strip_view'
  | 'cancel_remind_later'
  | 'paywall_exit_intent'
  | 'paywall_exit_continue';

export interface AnalyticsEntry {
  event: AnalyticsEvent;
  /** YYYY-MM-DD bucket, used for DAU calculations. */
  day: string;
  ts: number;
  /** Optional context, e.g. helper id. Kept short. */
  ref?: string;
}

const KEY = 'petswap.analytics.v1';
const EVENT = 'petswap:analytics-changed';
const MAX_ENTRIES = 1000;

const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const read = (): AnalyticsEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEntry[]) : [];
  } catch {
    return [];
  }
};

const write = (entries: AnalyticsEntry[]) => {
  try {
    const trimmed = entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
};

export const trackEvent = (event: AnalyticsEvent, ref?: string) => {
  const ts = Date.now();
  const entries = read();
  entries.push({ event, ts, day: dayKey(ts), ref });
  write(entries);
};

/** Record an `app_open` once per session — guarded by an in-memory flag. */
let _sessionLogged = false;
export const trackSessionOpen = () => {
  if (_sessionLogged) return;
  _sessionLogged = true;
  trackEvent('app_open');
};

export interface MetricSummary {
  dau: number;
  wau: number;
  mau: number;
  retention7: number;
  retention30: number;
  repeatBookings: number;
  favouritesUsed: number;
  requestsSent: number;
  requestsCompleted: number;
  completionRate: number;
  /** Revenue funnel rollups. */
  subscriptionViews: number;
  subscriptionTaps: number;
  subscriptionsConverted: number;
  subscriptionConversionRate: number;
  boostsActivated: number;
  /** Per-day series for the last N days, oldest first. */
  series: { day: string; opens: number }[];
}

const inLastNDays = (ts: number, n: number): boolean => {
  const cutoff = Date.now() - n * 24 * 60 * 60 * 1000;
  return ts >= cutoff;
};

const uniqueDays = (entries: AnalyticsEntry[]): Set<string> => {
  const set = new Set<string>();
  entries.forEach(e => set.add(e.day));
  return set;
};

export const computeSummary = (entries: AnalyticsEntry[]): MetricSummary => {
  const todayKey = dayKey(Date.now());
  const opens = entries.filter(e => e.event === 'app_open');

  const dau = opens.filter(e => e.day === todayKey).length > 0 ? 1 : 0;
  const wauDays = uniqueDays(opens.filter(e => inLastNDays(e.ts, 7)));
  const mauDays = uniqueDays(opens.filter(e => inLastNDays(e.ts, 30)));

  const requestsSent = entries.filter(e => e.event === 'request_sent').length;
  const requestsCompleted = entries.filter(
    e => e.event === 'request_completed' || e.event === 'booking_completed',
  ).length;
  const repeatBookings = entries.filter(e => e.event === 'favourite_rebook').length;
  const favouritesUsed = entries.filter(
    e => e.event === 'favourite_added' || e.event === 'favourite_rebook',
  ).length;

  const subscriptionViews = entries.filter(e => e.event === 'subscription_view').length;
  const subscriptionTaps = entries.filter(e => e.event === 'subscription_upgrade_tap').length;
  const subscriptionsConverted = entries.filter(e => e.event === 'subscription_subscribed').length;
  const boostsActivated = entries.filter(e => e.event === 'boost_activated').length;

  // Build a 14-day open series for the sparkline.
  const series: { day: string; opens: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const ts = Date.now() - i * 24 * 60 * 60 * 1000;
    const k = dayKey(ts);
    const count = opens.filter(o => o.day === k).length;
    series.push({ day: k, opens: count });
  }

  // Soft retention proxy: fraction of last-N-day open-buckets that have ≥1 open.
  const retention7 = Math.round((wauDays.size / 7) * 100);
  const retention30 = Math.round((mauDays.size / 30) * 100);

  return {
    dau,
    wau: wauDays.size,
    mau: mauDays.size,
    retention7,
    retention30,
    repeatBookings,
    favouritesUsed,
    requestsSent,
    requestsCompleted,
    completionRate: requestsSent === 0 ? 0 : Math.round((requestsCompleted / requestsSent) * 100),
    subscriptionViews,
    subscriptionTaps,
    subscriptionsConverted,
    subscriptionConversionRate:
      subscriptionViews === 0 ? 0 : Math.round((subscriptionsConverted / subscriptionViews) * 100),
    boostsActivated,
    series,
  };
};

export const useAnalyticsSummary = (): MetricSummary => {
  const [entries, setEntries] = useState<AnalyticsEntry[]>(() => read());
  useEffect(() => {
    const refresh = () => setEntries(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return computeSummary(entries);
};
