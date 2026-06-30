'use client'

import { useCallback, useEffect, useState, type ComponentType } from 'react'
import type { AppShellProps } from '@/components/app/AppShell.types'
import StartPageChrome from '@/components/start/StartPageChrome'
import StartShell from '@/components/start/StartShell'
import { prefetchBranches } from '@/lib/start/branchRegistry'
import { createEmptyBridge, mergeBridgeState, type StartBridgeState } from '@/lib/start/startBridge'
import { isIosSafariUserAgent } from '@/lib/iosSafariViewport'

type AppShellComponent = ComponentType<AppShellProps>
type AppShellLoadState = 'pending' | 'ready' | 'error'

function scheduleIdlePrefetch(): void {
  if (typeof window === 'undefined') return
  const run = () => {
    prefetchBranches(['hub', 'lesson', 'chat'])
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run)
    return
  }
  setTimeout(run, 1500)
}

export default function Page() {
  const [AppShellComponent, setAppShellComponent] = useState<AppShellComponent | null>(null)
  const [appShellLoadState, setAppShellLoadState] = useState<AppShellLoadState>('pending')
  const [appShellLoadNonce, setAppShellLoadNonce] = useState(0)
  const [bridge, setBridge] = useState<StartBridgeState>(createEmptyBridge)

  useEffect(() => {
    let cancelled = false
    setAppShellLoadState('pending')
    scheduleIdlePrefetch()
    void import('@/components/app/AppShell')
      .then((mod) => {
        if (cancelled) return
        if (mod?.default) {
          setAppShellComponent(() => mod.default)
          setAppShellLoadState('ready')
          return
        }
        setAppShellLoadState('error')
      })
      .catch((error) => {
        console.error('Failed to load AppShell', error)
        if (!cancelled) setAppShellLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [appShellLoadNonce])

  const handleRetryAppShellLoad = useCallback(() => {
    setAppShellComponent(null)
    setAppShellLoadNonce((n) => n + 1)
  }, [])

  const handleRuntimeReady = useCallback(() => {
    setBridge((current) => mergeBridgeState(current, { runtimeLoading: false }))
  }, [])

  const isIosSafariClient =
    typeof navigator !== 'undefined' && isIosSafariUserAgent(navigator.userAgent)

  const showStartFallback = !AppShellComponent

  return (
    <>
      {AppShellComponent ? (
        <AppShellComponent entryBridge={bridge} onRuntimeReady={handleRuntimeReady} />
      ) : null}

      {showStartFallback ? (
        <div
          data-audience={bridge.audience ?? undefined}
          className="start-screen-surface fixed inset-0 z-50 flex min-h-[100dvh] h-[100dvh] flex-col"
        >
          <StartPageChrome
            appShellLoadState={appShellLoadState}
            onRetryAppShellLoad={handleRetryAppShellLoad}
          />
          <main
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            style={{
              paddingTop: 'var(--app-top-offset)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              ...(isIosSafariClient ? { scrollPaddingTop: 'var(--app-top-offset)' } : {}),
            }}
          >
            <StartShell bridge={bridge} onBridgeChange={setBridge} />
          </main>
        </div>
      ) : null}
    </>
  )
}
