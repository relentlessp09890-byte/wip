self.addEventListener('push', function(event) {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:               data.body,
      icon:               '/icon-192.png',
      badge:              '/icon-192.png',
      tag:                data.tag || 'marqbridge',
      requireInteraction: data.requireInteraction || false,
      data:               { url: data.url || '/' },
      actions: [
        { action: 'open',    title: 'Open MarqBridge' },
        { action: 'dismiss', title: 'Dismiss'         },
      ],
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.action === 'dismiss') return
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow(event.notification.data.url || '/')
    })
  )
})