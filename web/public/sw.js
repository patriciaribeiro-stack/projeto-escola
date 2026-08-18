self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { titulo: 'Colégio Vital Brazil', corpo: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.titulo || 'Colégio Vital Brazil', {
      body: data.corpo || '',
      icon: '/logo-escola.png',
      badge: '/logo-escola.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    }),
  )
})
