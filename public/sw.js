/* Intersemester service worker: shows Web Push notifications (FCM) on the web and in the
   installed PWA, including iPhone/iPad (iOS 16.4+ when added to the Home Screen).
   iOS requires every push to show a notification, so we always display one. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { body: event.data ? event.data.text() : '' } };
  }
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || 'Intersemester';
  const link = (payload.fcmOptions && payload.fcmOptions.link) || d.link || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || d.body || '',
      icon: n.icon || '/logo51.png',
      badge: '/logo51.png',
      tag: n.tag || d.tag || undefined,
      renotify: !!(n.tag || d.tag),
      data: { link },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate && link !== '/' ? client.navigate(link) : null;
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(link) : undefined;
    })
  );
});
