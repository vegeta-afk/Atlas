self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Notification', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png', // swap for your actual logo path if you have one
      badge: '/icon.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/admin/faculty/attendance'));
});