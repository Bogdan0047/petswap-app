/**
 * Safe Auto Publish — flow checks.
 *
 * Dev-only utilities that verify the critical user journeys before publish.
 * Each check is a self-contained async function that resolves with a result.
 *
 * Checks intentionally avoid writing to the database. They:
 *   - confirm critical routes are registered
 *   - confirm key handlers/components exist in the running bundle
 *   - simulate navigations and DOM mounts
 *   - read-only probe Supabase for data presence
 */

import { supabase } from '@/integrations/supabase/client';
import { getRecordedErrors } from '@/lib/consoleErrorRecorder';

export type CheckStatus = 'pending' | 'running' | 'pass' | 'fail' | 'warn';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
  durationMs?: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Routes the app must expose for the critical flows. */
const REQUIRED_ROUTES = [
  '/home',
  '/explore',
  '/inbox',
  '/profile',
  '/profiles/:id',
  '/auth',
  '/activity',
];

/**
 * We can't read React Router config directly without coupling, so we
 * navigate to each route via history and check that:
 *   - the URL updates
 *   - <body> doesn't end up empty / blank
 *   - no uncaught error is thrown synchronously
 * Then we restore the original URL.
 */
const probeRoute = async (path: string, timeoutMs = 800): Promise<boolean> => {
  const original = window.location.pathname + window.location.search;
  try {
    // For dynamic routes use a placeholder id.
    const concrete = path.replace(':id', 'preview-check').replace(':bookingId', 'preview-check');
    window.history.pushState({}, '', concrete);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(timeoutMs);
    const root = document.getElementById('root');
    const ok = !!root && root.childElementCount > 0 && root.innerText.trim().length > 0;
    return ok;
  } catch {
    return false;
  } finally {
    window.history.pushState({}, '', original);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(80);
  }
};

export const checkRoutesRegistered = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const failed: string[] = [];
  for (const r of REQUIRED_ROUTES) {
    const ok = await probeRoute(r, 500);
    if (!ok) failed.push(r);
  }
  return {
    id: 'routes',
    label: 'Critical routes mount',
    status: failed.length === 0 ? 'pass' : 'fail',
    detail:
      failed.length === 0
        ? `${REQUIRED_ROUTES.length} routes mounted successfully`
        : `Failed routes: ${failed.join(', ')}`,
    durationMs: Math.round(performance.now() - t0),
  };
};

export const checkViewProfileFlow = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const original = window.location.pathname;
  try {
    window.history.pushState({}, '', '/profiles/preview-check');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(900);
    const text = document.body.innerText.toLowerCase();
    // PublicProfile shows either profile data or a "not found" friendly state — both prove the route mounted.
    const mounted = text.includes('send request') || text.includes('profile') || text.includes('not found');
    // Critical: must NOT have opened the QuickRequestSheet ("Which pet needs care?")
    const wrongModalOpen = text.includes('which pet needs care');
    if (!mounted) {
      return {
        id: 'view-profile',
        label: 'View profile opens public profile',
        status: 'fail',
        detail: 'PublicProfile route did not render',
        durationMs: Math.round(performance.now() - t0),
      };
    }
    if (wrongModalOpen) {
      return {
        id: 'view-profile',
        label: 'View profile opens public profile',
        status: 'fail',
        detail: 'View profile is incorrectly opening the request modal',
        durationMs: Math.round(performance.now() - t0),
      };
    }
    return {
      id: 'view-profile',
      label: 'View profile opens public profile',
      status: 'pass',
      detail: 'Profile route renders without triggering request modal',
      durationMs: Math.round(performance.now() - t0),
    };
  } finally {
    window.history.pushState({}, '', original);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(80);
  }
};

export const checkSendRequestFlow = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const original = window.location.pathname;
  try {
    window.history.pushState({}, '', '/home');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(800);
    // Look for the primary "Get help" / "Send request" CTA on home.
    const buttons = Array.from(document.querySelectorAll('button, a')) as HTMLElement[];
    const cta = buttons.find((b) => /get help|send request|request help|need care/i.test(b.innerText));
    if (!cta) {
      return {
        id: 'send-request',
        label: 'Send request flow available',
        status: 'warn',
        detail: 'Primary request CTA not found on Home (may be lazy-loaded)',
        durationMs: Math.round(performance.now() - t0),
      };
    }
    return {
      id: 'send-request',
      label: 'Send request flow available',
      status: 'pass',
      detail: `Found CTA: "${cta.innerText.trim().slice(0, 40)}"`,
      durationMs: Math.round(performance.now() - t0),
    };
  } finally {
    window.history.pushState({}, '', original);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(80);
  }
};

export const checkMessagesFlow = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const original = window.location.pathname;
  try {
    window.history.pushState({}, '', '/inbox');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(900);
    const text = document.body.innerText.toLowerCase();
    const mounted =
      text.includes('inbox') ||
      text.includes('message') ||
      text.includes('no conversations') ||
      text.includes('chat');
    return {
      id: 'messages',
      label: 'Messages / Inbox loads',
      status: mounted ? 'pass' : 'fail',
      detail: mounted ? 'Inbox renders with content or empty state' : 'Inbox did not render',
      durationMs: Math.round(performance.now() - t0),
    };
  } finally {
    window.history.pushState({}, '', original);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await wait(80);
  }
};

export const checkLocationVerify = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  if (!supported) {
    return {
      id: 'location',
      label: 'Location verify available',
      status: 'fail',
      detail: 'navigator.geolocation not available in this environment',
      durationMs: Math.round(performance.now() - t0),
    };
  }
  // Check a saved coord cache OR a profile lat/lng exists. Either is acceptable.
  let hasCache = false;
  try {
    hasCache = !!localStorage.getItem('petswap.geo.coords.v1');
  } catch {
    /* ignore */
  }
  let hasProfileCoords = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', user.id)
        .maybeSingle();
      hasProfileCoords = !!(data?.latitude && data?.longitude);
    }
  } catch {
    /* ignore */
  }
  return {
    id: 'location',
    label: 'Location verify available',
    status: 'pass',
    detail: hasCache || hasProfileCoords
      ? 'Geolocation supported & user has location set'
      : 'Geolocation supported (user has not set location yet)',
    durationMs: Math.round(performance.now() - t0),
  };
};

export const checkAuthSession = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return {
        id: 'auth',
        label: 'Auth service reachable',
        status: 'fail',
        detail: error.message,
        durationMs: Math.round(performance.now() - t0),
      };
    }
    return {
      id: 'auth',
      label: 'Auth service reachable',
      status: 'pass',
      detail: data.session ? 'Active session detected' : 'Auth reachable, no active session',
      durationMs: Math.round(performance.now() - t0),
    };
  } catch (e) {
    return {
      id: 'auth',
      label: 'Auth service reachable',
      status: 'fail',
      detail: e instanceof Error ? e.message : String(e),
      durationMs: Math.round(performance.now() - t0),
    };
  }
};

/* ============================================================
 * Auto Publish Guard checks
 * Stricter than the per-flow audit — these gate the publish action.
 * ============================================================ */

/** No console errors recorded since the page loaded (or since last audit). */
export const checkNoConsoleErrors = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const errs = getRecordedErrors();
  const blocking = errs.filter((e) => e.source !== 'console.warn' || /failed|error/i.test(e.message));
  if (blocking.length === 0) {
    return {
      id: 'no-console-errors',
      label: 'No console errors',
      status: 'pass',
      detail: 'Console clean since session start',
      durationMs: Math.round(performance.now() - t0),
    };
  }
  const sample = blocking[blocking.length - 1].message.slice(0, 140);
  return {
    id: 'no-console-errors',
    label: 'No console errors',
    status: 'fail',
    detail: `${blocking.length} error(s) recorded. Latest: ${sample}`,
    durationMs: Math.round(performance.now() - t0),
  };
};

/** Confirm the Supabase REST + Auth APIs respond successfully. */
export const checkApiHealth = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const failures: string[] = [];
  try {
    const { error } = await supabase.auth.getSession();
    if (error) failures.push(`auth: ${error.message}`);
  } catch (e) {
    failures.push(`auth: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    // Lightweight head-style read against a public, RLS-protected table.
    // We don't care about rows — only that the request returns OK.
    const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) failures.push(`db: ${error.message}`);
  } catch (e) {
    failures.push(`db: ${e instanceof Error ? e.message : String(e)}`);
  }
  return {
    id: 'api-health',
    label: 'API calls return success',
    status: failures.length === 0 ? 'pass' : 'fail',
    detail: failures.length === 0 ? 'Auth + Database responded OK' : failures.join(' | '),
    durationMs: Math.round(performance.now() - t0),
  };
};

/** Navigation integrity — no route should silently 404 or render NotFound. */
export const checkNavigationIntegrity = async (): Promise<CheckResult> => {
  const t0 = performance.now();
  const original = window.location.pathname + window.location.search;
  const broken: string[] = [];
  for (const r of REQUIRED_ROUTES) {
    const concrete = r.replace(':id', 'preview-check').replace(':bookingId', 'preview-check');
    try {
      window.history.pushState({}, '', concrete);
      window.dispatchEvent(new PopStateEvent('popstate'));
      await wait(450);
      const text = (document.body.innerText || '').toLowerCase();
      // NotFound page renders "404" and/or "page not found"
      if (text.includes('404') && text.includes('not found') && !text.includes('profile')) {
        broken.push(concrete);
      }
    } catch {
      broken.push(concrete);
    }
  }
  window.history.pushState({}, '', original);
  window.dispatchEvent(new PopStateEvent('popstate'));
  await wait(80);
  return {
    id: 'navigation',
    label: 'No broken navigation',
    status: broken.length === 0 ? 'pass' : 'fail',
    detail: broken.length === 0 ? 'All routes resolve cleanly' : `Broken: ${broken.join(', ')}`,
    durationMs: Math.round(performance.now() - t0),
  };
};

export interface AuditRunOptions {
  onUpdate?: (results: CheckResult[]) => void;
}

const ALL_CHECKS: Array<{ id: string; label: string; run: () => Promise<CheckResult> }> = [
  { id: 'auth', label: 'Auth service reachable', run: checkAuthSession },
  { id: 'routes', label: 'Critical routes mount', run: checkRoutesRegistered },
  { id: 'view-profile', label: 'View profile opens public profile', run: checkViewProfileFlow },
  { id: 'send-request', label: 'Send request flow available', run: checkSendRequestFlow },
  { id: 'messages', label: 'Messages / Inbox loads', run: checkMessagesFlow },
  { id: 'location', label: 'Location verify available', run: checkLocationVerify },
  // Guard checks — run last so any errors triggered by earlier probes are captured.
  { id: 'navigation', label: 'No broken navigation', run: checkNavigationIntegrity },
  { id: 'api-health', label: 'API calls return success', run: checkApiHealth },
  { id: 'no-console-errors', label: 'No console errors', run: checkNoConsoleErrors },
];

/** IDs that gate the publish button. ALL must pass. */
export const PUBLISH_GUARD_IDS = [
  'routes',
  'navigation',
  'api-health',
  'no-console-errors',
] as const;

export const runFullAudit = async (opts: AuditRunOptions = {}): Promise<CheckResult[]> => {
  const results: CheckResult[] = ALL_CHECKS.map((c) => ({
    id: c.id,
    label: c.label,
    status: 'pending',
  }));
  opts.onUpdate?.([...results]);

  for (let i = 0; i < ALL_CHECKS.length; i++) {
    results[i] = { ...results[i], status: 'running' };
    opts.onUpdate?.([...results]);
    try {
      results[i] = await ALL_CHECKS[i].run();
    } catch (e) {
      results[i] = {
        ...results[i],
        status: 'fail',
        detail: e instanceof Error ? e.message : String(e),
      };
    }
    opts.onUpdate?.([...results]);
  }
  return results;
};

export const isAuditPassing = (results: CheckResult[]): boolean =>
  results.length > 0 && results.every((r) => r.status === 'pass' || r.status === 'warn');

export const hasFailures = (results: CheckResult[]): boolean =>
  results.some((r) => r.status === 'fail');

/** True only if every guard-gating check has passed. Blocks publish otherwise. */
export const isPublishGuardPassing = (results: CheckResult[]): boolean => {
  if (results.length === 0) return false;
  return PUBLISH_GUARD_IDS.every((id) => {
    const r = results.find((x) => x.id === id);
    return r?.status === 'pass';
  });
};

/** Reasons the guard is blocking, for the UI banner. */
export const getGuardBlockers = (results: CheckResult[]): string[] => {
  return PUBLISH_GUARD_IDS
    .map((id) => results.find((r) => r.id === id))
    .filter((r): r is CheckResult => !!r && r.status !== 'pass')
    .map((r) => r.label);
};

