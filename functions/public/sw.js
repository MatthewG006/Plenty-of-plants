self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // This is a pass-through fetch handler.
  event.respondWith(fetch(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'schedule-notifications') {
    // Placeholder for scheduling notifications
    console.log('Service Worker received: schedule-notifications');
  } else if (event.data === 'cancel-notifications') {
    // Placeholder for cancelling notifications
    console.log('Service Worker received: cancel-notifications');
  }
});
