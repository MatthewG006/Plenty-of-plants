
'use strict';

let timerId;

self.addEventListener('message', (event) => {
  if (event.data === 'schedule-notifications') {
    const sixHours = 6 * 60 * 60 * 1000;

    // Clear any existing timer to avoid duplicates
    if (timerId) {
      clearInterval(timerId);
    }
    
    const showNotification = () => {
      const notificationOptions = {
        body: 'Your plants miss you! Come back and help them grow.',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'plant-reminder',
        renotify: true,
      };

      self.registration.showNotification('A Friendly Reminder from Your Plants!', notificationOptions);
    };

    // Show first notification immediately for testing/confirmation, then schedule.
    // In a real app, you might only start the interval.
    showNotification();
    
    // Schedule subsequent notifications
    timerId = setInterval(showNotification, sixHours);

  } else if (event.data === 'cancel-notifications') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    // Also close any currently visible notifications with the same tag
    self.registration.getNotifications({ tag: 'plant-reminder' }).then(notifications => {
      notifications.forEach(notification => notification.close());
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});
