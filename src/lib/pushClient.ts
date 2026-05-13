// Client SDK for PetSwap Web Push notifications.
//
// Responsibilities:
//   - Register the dedicated push service worker (`/push-sw.js`) at the root
//     scope WITHOUT registering a full PWA service worker that would cache
//     pages. Safe to use inside the Lovable preview iframe.
//   - Detect environment support and current permission state.
//   - Subscribe via PushManager and persist the subscription server-side.
//   - Expose helpers for the value-moment prompts (after first match,
//     first message, first booking).
//
// Permission strategy: NEVER auto-prompt. Components call
// `maybePromptForPush(reason)` at high-value moments; the helper itself
// throttles via localStorage so the user is asked at most once per reason.

import { supabase } from '@/integrations/supabase/client';

const SW_PATH = '/push-sw.js';
const PROMPT_FLAG_PREFIX = 'petswap.push.prompted.';
const PROMPT_GLOBAL_FLAG = 'petswap.push.lastPromptAt';
const MIN_GAP_MS = 24 * 60 * 60 * 1000; // never re-ask within 24h regardless of reason

export type PromptReason = 'first_match' | 'first_message' | 'first_booking' | 'settings';

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registerPushSW(): Promise<ServiceWorkerRegistration> {
  // Use update-on-navigate so a new SW takes effect cleanly.
  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  await reg.update().catch(() => undefined);
  return reg;
}

async function getPublicVapidKey(): Promise<string | null> {
  // Fetched once from the server so we never bake the key into the bundle.
  try {
    const { data, error } = await supabase.functions.invoke('push-config', { body: {} });
    if (error) {
      console.warn('[pushClient] config fetch failed', error);
      return null;
    }
    return (data as { publicKey?: string } | null)?.publicKey ?? null;
  } catch (e) {
    console.warn('[pushClient] config fetch error', e);
    return null;
  }
}

/** Subscribe (creating the SW + PushSubscription) and persist server-side. */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (Notification.permission === 'denied') return { ok: false, reason: 'denied' };

  if (Notification.permission !== 'granted') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return { ok: false, reason: result };
  }

  const reg = await registerPushSW();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const publicKey = await getPublicVapidKey();
    if (!publicKey) return { ok: false, reason: 'no_vapid_key' };
    const keyBytes = urlBase64ToUint8Array(publicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    });
  }

  const json = sub.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'invalid_subscription' };
  }

  const { error } = await supabase.functions.invoke('save-push-subscription', {
    body: {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
      platform: navigator.platform,
    },
  });
  if (error) {
    console.warn('[pushClient] save subscription failed', error);
    return { ok: false, reason: 'save_failed' };
  }
  return { ok: true };
}

/** Unsubscribe locally and on server. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => undefined);
    await supabase.functions
      .invoke('save-push-subscription', { body: { endpoint, remove: true } })
      .catch(() => undefined);
  }
}

/** Has this reason been used to prompt before? */
function alreadyPrompted(reason: PromptReason): boolean {
  try {
    return !!localStorage.getItem(PROMPT_FLAG_PREFIX + reason);
  } catch {
    return false;
  }
}

function markPrompted(reason: PromptReason) {
  try {
    localStorage.setItem(PROMPT_FLAG_PREFIX + reason, String(Date.now()));
    localStorage.setItem(PROMPT_GLOBAL_FLAG, String(Date.now()));
  } catch { /* noop */ }
}

function lastPromptAgeMs(): number {
  try {
    const v = Number(localStorage.getItem(PROMPT_GLOBAL_FLAG) ?? '0');
    return Number.isFinite(v) && v > 0 ? Date.now() - v : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Trigger the OS permission prompt + subscribe, but only at the right moment:
 *   - never auto-prompt at signup
 *   - only after a value moment passed in `reason`
 *   - never re-ask once granted/denied
 *   - never re-ask the same reason twice
 *   - never re-ask within 24h regardless of reason
 */
export async function maybePromptForPush(reason: PromptReason): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission === 'granted') {
    // Already granted — make sure server has a fresh subscription.
    void subscribeToPush();
    return false;
  }
  if (Notification.permission === 'denied') return false;
  if (alreadyPrompted(reason)) return false;
  if (lastPromptAgeMs() < MIN_GAP_MS) return false;

  markPrompted(reason);
  const res = await subscribeToPush();
  return res.ok;
}

/** Wire up the SW → page click router. Call once near app boot. */
export function wirePushClickRouter(navigate: (path: string) => void) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; url?: string; eventId?: string } | null;
    if (!data || data.type !== 'PUSH_CLICK' || !data.url) return;
    try {
      const u = new URL(data.url, window.location.origin);
      navigate(u.pathname + u.search + u.hash);
      // Fire-and-forget click tracking.
      if (data.eventId) {
        supabase.functions
          .invoke('push-track', { body: { event_id: data.eventId, kind: 'click' } })
          .catch(() => undefined);
      }
    } catch { /* noop */ }
  });
}

/** Track an OPEN when the app loads via a push link (no SW message available). */
export function trackPushOpenFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('n');
    const kind = params.get('nt');
    if (!eventId) return;
    supabase.functions
      .invoke('push-track', { body: { event_id: eventId, kind: kind === 'click' ? 'click' : 'open' } })
      .catch(() => undefined);
  } catch { /* noop */ }
}
