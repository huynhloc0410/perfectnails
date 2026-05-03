/* Admin alerts only: handle taps when notifications were shown via showNotification(). */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var raw = event.notification.data && event.notification.data.url;
  var urlToOpen = raw
    ? new URL(raw, self.location.origin).href
    : self.location.origin + '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }),
  );
});
