// PetSwap push notifications service worker.
// Scope: /push-sw.js → registered with scope '/' so notification clicks
// can focus or open any in-app route.
//
// IMPORTANT: this SW does NOT cache pages or intercept fetches — it exists
// purely to receive Web Push events and route notification clicks. That keeps
// it safe to use alongside Lovable's preview iframe and avoids stale-content
// problems associated with full PWA service workers.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: 'PetSwap', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'PetSwap';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.png',
    badge: payload.badge || '/favicon.png',
    tag: payload.tag || undefined,
    renotify: !!payload.renotify,
    data: {
      url: payload.url || '/',
      eventId: payload.eventId || null,
      type: payload.type || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || '/', self.location.origin);
  // Append a click marker so the page can ping the track endpoint.
  if (data.eventId) {
    targetUrl.searchParams.set('n', data.eventId);
    targetUrl.searchParams.set('nt', 'click');
  }
  const finalUrl = targetUrl.toString();

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const u = new URL(client.url);
        if (u.origin === self.location.origin) {
          await client.focus();
          // Tell the page to navigate.
          client.postMessage({ type: 'PUSH_CLICK', url: finalUrl, eventId: data.eventId });
          return;
        }
      } catch (_e) { /* noop */ }
    }
    await self.clients.openWindow(finalUrl);
  })());
});
