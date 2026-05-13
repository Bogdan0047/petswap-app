// Email conversion tracker.
// Call trackEmailConversion('open_chat') after a user completes an action that
// originated from an email click. We pull the eventId from ?e=<uuid> in the URL,
// stash it in sessionStorage, and ping the public email-track endpoint.

const STORAGE_KEY = 'petswap.emailEventId';

/** Capture an email event id from the URL on app boot. Call once on mount. */
export function captureEmailEventId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const eid = params.get('e');
    if (eid && /^[0-9a-f-]{32,40}$/i.test(eid)) {
      sessionStorage.setItem(STORAGE_KEY, eid);
    }
  } catch {
    // ignore
  }
}

/** Mark the most recent email-originated visit as converted. Fire-and-forget. */
export async function trackEmailConversion(cta: string) {
  try {
    const eid = sessionStorage.getItem(STORAGE_KEY);
    if (!eid) return;
    const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-track`;
    await fetch(`${base}/conv/${eid}/${encodeURIComponent(cta)}`, {
      method: 'POST',
      keepalive: true,
    });
    // Clear so we don't double-count
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[email-conversion] failed', err);
  }
}
