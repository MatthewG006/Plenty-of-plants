// A basic service worker
self.addEventListener('fetch', (event) => {
  // We are not adding any specific caching logic for now.
  // This file is primarily to enable PWA installation.
});

self.addEventListener('message', (event) => {
    if (event.data === 'schedule-notifications') {
        // Schedule notifications logic
    } else if (event.data === 'cancel-notifications') {
        // Cancel notifications logic
    }
});
