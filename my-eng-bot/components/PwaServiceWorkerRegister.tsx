'use client'

import { useEffect } from 'react'

export default function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('PWA service worker registration failed:', error)
    })
  }, [])

  return null
}
