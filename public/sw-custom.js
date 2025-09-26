self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || payload.TITLE || 'Notification';
  const body = payload.message || payload.body || '';
  const options = {
    body,
    icon: payload.icon || '/assets/icons/images/favicon.png',
    data: payload.data || { url: '/' }
  };
 console.log('Push received', event.data ? event.data.json() : {});
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // notify open clients (so in-app UI can update)
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'PUSH_RECEIVED', payload }));
      })
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(clients.openWindow(url));
});
