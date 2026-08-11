'use client'

import { useEffect } from 'react'

export default function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Dev/`next start` leftovers on localhost: old SW kept wrapping navigations
    // and left Edge with a spinning omnibox + Stop (X) after paint.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister()
        }
      })
      return
    }

    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch((error: unknown) => {
        console.warn('PWA service worker registration failed:', error)
      })
  }, [])

  return null
}
