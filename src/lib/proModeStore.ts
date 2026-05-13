import { useEffect, useState } from 'react';

/**
 * Helper Pro Mode — an opt-in mode for active helpers. When enabled:
 *  - Their profile gets visibility boost in helper carousels.
 *  - They see more matched request opportunities.
 *  - Schedule tools (block-out days, weekly recurring availability) unlock.
 *
 * Pro Mode is included in the premium subscription. Free helpers can
 * preview Pro Mode for 7 days, after which it auto-expires.
 */

const KEY = 'petswap.proMode.v1';
const EVENT = 'petswap:proMode-changed';

interface ProModeState {
  enabled: boolean;
  /** ISO date when free preview started; null if user is on premium. */
  trialStartedAt: string | null;
}

const TRIAL_DAYS = 7;

const empty = (): ProModeState => ({ enabled: false, trialStartedAt: null });

const read = (): ProModeState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      trialStartedAt: typeof parsed.trialStartedAt === 'string' ? parsed.trialStartedAt : null,
    };
  } catch {
    return empty();
  }
};

const write = (next: ProModeState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
};

export const trialDaysRemaining = (state: ProModeState): number | null => {
  if (!state.trialStartedAt) return null;
  const elapsed = Date.now() - Date.parse(state.trialStartedAt);
  const total = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((total - elapsed) / (24 * 60 * 60 * 1000));
  return Math.max(remaining, 0);
};

/** Toggle Pro Mode. If user is free and trial hasn't started, start it. */
export const setProModeEnabled = (enabled: boolean, isPremium: boolean) => {
  const current = read();
  const next: ProModeState = {
    enabled,
    trialStartedAt:
      !isPremium && enabled && !current.trialStartedAt
        ? new Date().toISOString()
        : current.trialStartedAt,
  };
  write(next);
};

export const useProMode = (isPremium: boolean) => {
  const [state, setState] = useState<ProModeState>(() => read());
  useEffect(() => {
    const refresh = () => setState(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const trialLeft = trialDaysRemaining(state);
  // Effective Pro Mode is on if: user enabled it AND (premium OR trial active).
  const trialActive = !isPremium && state.trialStartedAt !== null && (trialLeft ?? 0) > 0;
  const effective = state.enabled && (isPremium || trialActive);

  return {
    enabled: state.enabled,
    effective,
    isPremium,
    trialActive,
    trialDaysLeft: trialLeft,
    setEnabled: (v: boolean) => setProModeEnabled(v, isPremium),
  };
};
