// Self-destructing service worker — removes the old workbox SW
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  await self.clients.claim()
  await self.registration.unregister()
  const clients = await self.clients.matchAll({ type: 'window' })
  for (const client of clients) {
    client.navigate(client.url)
  }
})
