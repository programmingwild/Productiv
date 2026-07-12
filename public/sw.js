self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title ?? "Notification"
    const options = {
      body: data.message ?? "",
      icon: data.icon ?? "/icon.svg",
      badge: data.badge ?? "/icon.svg",
      data: { url: data.link ?? "/" },
      vibrate: [200, 100, 200],
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch {
    const text = event.data.text()
    event.waitUntil(self.registration.showNotification("ProductSaaS", { body: text }))
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const matching = windowClients.find((c) => c.url === url)
      if (matching) {
        matching.focus()
      } else {
        clients.openWindow(url)
      }
    }),
  )
})
