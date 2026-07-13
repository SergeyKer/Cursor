'use client'

import { useCallback, useEffect, useState, type ComponentType } from 'react'
import type { AppShellProps } from '@/components/app/AppShell.types'
import StartPageChrome from '@/components/start/StartPageChrome'
import StartShell from '@/components/start/StartShell'
import { prefetchBranches } from '@/lib/start/branchRegistry'
import { createEmptyBridge, mergeBridgeState, type StartBridgeState } from '@/lib/start/startBridge'
import { isIosSafariUserAgent } from '@/lib/iosSafariViewport'
import { peekOpenLessonIntent } from '@/lib/quickTest/openLessonIntent'

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
  const [skipStartForQuickTest, setSkipStartForQuickTest] = useState(false)

  useEffect(() => {
    const intent = peekOpenLessonIntent()
    if (intent?.audience) {
      setSkipStartForQuickTest(true)
      setBridge((current) =>
        mergeBridgeState(current, {
          audience: intent.audience,
          audienceChosen: true,
          branchIntent: 'hub',
        })
      )
    }
  }, [])

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

  const showStartFallback = !AppShellComponent && !skipStartForQuickTest
  const showQuickTestLoading = !AppShellComponent && skipStartForQuickTest

  return (
    <>
      {AppShellComponent ? (
        <AppShellComponent entryBridge={bridge} onRuntimeReady={handleRuntimeReady} />
      ) : null}

      {showQuickTestLoading ? (
        <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-[var(--bg,#c3d6e2)] text-[var(--text)]">
          <div className="text-center">
            <div className="text-[17px] font-semibold">Engvo AI</div>
            <div className="mt-2 text-[14px] opacity-70">Открываем урок…</div>
          </div>
        </div>
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
