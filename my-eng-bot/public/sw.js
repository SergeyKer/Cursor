/* engvo-sw-v20260811a — bump forces clients to re-fetch this file */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.clients.claim()
    })()
  )
})

/**
 * Do not intercept fetches.
 * A blanket `respondWith(fetch(request))` wraps App Router navigation/RSC
 * streams and can leave Edge/Chrome with a spinning omnibox + Stop (X)
 * after the UI has already painted.
 */
