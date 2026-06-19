'use client'

import { useCallback, useEffect, useState, type ComponentType } from 'react'
import type { AppShellProps } from '@/components/app/AppShell.types'
import StartPageChrome from '@/components/start/StartPageChrome'
import StartShell from '@/components/start/StartShell'
import { createEmptyBridge, mergeBridgeState, type StartBridgeState } from '@/lib/start/startBridge'
import { isIosSafariUserAgent } from '@/lib/iosSafariViewport'

type AppShellComponent = ComponentType<AppShellProps>

const RUNTIME_READY_TIMEOUT_MS = 20_000

export default function Page() {
  const [AppShellComponent, setAppShellComponent] = useState<AppShellComponent | null>(null)
  const [bridge, setBridge] = useState<StartBridgeState>(createEmptyBridge)
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void import('@/components/app/AppShell').then((mod) => {
      if (!cancelled) setAppShellComponent(() => mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleRuntimeReady = useCallback(() => {
    setBridge((current) => mergeBridgeState(current, { runtimeLoading: false }))
    setAppReady(true)
  }, [])

  useEffect(() => {
    if (appReady || !AppShellComponent) return
    const timeout = window.setTimeout(() => {
      setAppReady(true)
    }, RUNTIME_READY_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [appReady, AppShellComponent])

  const isIosSafariClient =
    typeof navigator !== 'undefined' && isIosSafariUserAgent(navigator.userAgent)

  return (
    <>
      {AppShellComponent ? (
        <div className={appReady ? undefined : 'hidden'} aria-hidden={!appReady}>
          <AppShellComponent entryBridge={bridge} onRuntimeReady={handleRuntimeReady} />
        </div>
      ) : null}

      {!appReady ? (
        <div
          data-audience={bridge.audience ?? undefined}
          className="start-screen-surface fixed inset-0 z-50 flex min-h-[100dvh] h-[100dvh] flex-col"
        >
          <StartPageChrome menuDisabled={!AppShellComponent} />
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
