'use client'

import { useEffect } from 'react'
import { AppIconFrame } from '@/components/AppIconFrame'
import TypingText from '@/components/TypingText'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import {
  applyChatPatternToDocument,
  type ChatPatternId,
  isChatPatternId,
} from '@/lib/chatPattern'
import { isIosSafariUserAgent } from '@/lib/iosSafariViewport'
import { formatFooterDynamicLine } from '@/lib/footerVoice'

const LOGO_SRC = '/engvo-logo-1024-plus5-eqletters.png'
const QUICK_TEST_PATTERN: ChatPatternId = 'study-doodles'
const IOS_SAFARI_DIALOG_ATTR = 'data-ios-safari-dialog'

type QuickTestPageChromeProps = {
  showExit?: boolean
  onExit?: () => void
  children: React.ReactNode
  footerDynamic?: string
  /** @deprecated bottom half is progress only */
  footerStatic?: string
  progress?: { current: number; total: number } | null
}

function QuickTestFooterProgress({
  current,
  total,
  hidden,
}: {
  current: number
  total: number
  hidden?: boolean
}) {
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(1, total)) * 100)))
  return (
    <div
      className="flex h-full min-h-0 w-full items-center px-3"
      aria-hidden={hidden ? true : undefined}
      style={hidden ? { visibility: 'hidden' } : undefined}
    >
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-black/10"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Шаг ${current} из ${total}`}
      >
        <div
          className="h-full rounded-full bg-[var(--text-accent,#4f8fe8)] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function QuickTestPageChrome({
  showExit = false,
  onExit,
  children,
  footerDynamic = '',
  progress = null,
}: QuickTestPageChromeProps) {
  useEffect(() => {
    const root = document.documentElement
    const prevPattern = root.getAttribute('data-chat-pattern')
    applyChatPatternToDocument(QUICK_TEST_PATTERN)

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const setIosAttr = isIosSafariUserAgent(ua)
    if (setIosAttr) {
      root.setAttribute(IOS_SAFARI_DIALOG_ATTR, '')
    }

    return () => {
      if (isChatPatternId(prevPattern)) {
        applyChatPatternToDocument(prevPattern)
      } else if (prevPattern) {
        root.setAttribute('data-chat-pattern', prevPattern)
      } else {
        root.removeAttribute('data-chat-pattern')
      }
      if (setIosAttr) {
        root.removeAttribute(IOS_SAFARI_DIALOG_ATTR)
      }
    }
  }, [])

  const showProgress = progress != null
  const progressCurrent = progress?.current ?? 0
  const progressTotal = progress?.total ?? 5
  const topLine = formatFooterDynamicLine(footerDynamic.trim())

  return (
    <div
      className="quick-test-root flex flex-col bg-[var(--bg)] text-[var(--text)]"
      style={{
        minHeight: 'var(--app-vv-height, var(--ios-safari-vv-height, 100dvh))',
        height: 'var(--app-vv-height, var(--ios-safari-vv-height, 100dvh))',
        overflow: 'hidden',
        ['--app-bottom-offset' as string]:
          'calc(var(--app-footer-chrome-height) + var(--vv-bottom-inset, 0px))',
      }}
    >
      <header
        className="app-header-surface fixed left-0 right-0 top-0 z-[65] border-b border-[var(--app-header-border)]"
        style={{ paddingTop: 'var(--app-safe-top-inset)' }}
      >
        <div className="chat-shell-x grid w-full min-h-[var(--app-header-row-height)] grid-cols-[2.5rem_1fr_2.5rem] items-center">
          <div className="col-start-1 flex items-center justify-start">
            {showExit ? (
              <button
                type="button"
                className="app-header-control chat-action-button flex h-10 w-10 items-center justify-center border text-[var(--app-header-text)] touch-manipulation"
                style={{ borderRadius: 'var(--app-header-control-radius)' }}
                aria-label={QUICK_TEST_COPY.exitLabel}
                onClick={onExit}
              >
                <span aria-hidden className="text-xl leading-none">
                  ×
                </span>
              </button>
            ) : null}
          </div>
          <h1
            className="col-start-2 truncate px-2 text-center text-[16px] font-semibold leading-[1.32] text-[var(--app-header-text)] sm:text-[17px]"
            style={{ fontFamily: 'var(--app-header-font-family)' }}
          >
            {QUICK_TEST_COPY.headerTitle}
          </h1>
          <div className="col-start-3 flex items-center justify-end">
            <AppIconFrame variant="header" src={LOGO_SRC} alt="Engvo" />
          </div>
        </div>
      </header>

      <main
        className="flex min-h-0 flex-1 flex-col"
        style={{
          paddingTop: 'var(--app-top-offset)',
          paddingBottom: 'var(--app-bottom-offset)',
        }}
      >
        {children}
      </main>

      <footer className="app-dialog-chrome-footer pointer-events-none fixed bottom-0 left-0 right-0 z-[55] flex flex-col overflow-visible">
        <div className="app-footer-surface h-[var(--app-footer-row-height)] min-h-[var(--app-footer-row-height)] shrink-0 border-t border-[var(--app-footer-border)]">
          <div className="app-footer-body pointer-events-none">
            <div className="app-footer-body__row app-footer-body__row--top">
              <div className="app-footer-body__row-inner mx-auto w-full max-w-[23.2rem] min-w-0 flex-1 px-2 sm:px-3">
                {topLine ? (
                  <TypingText
                    key={topLine}
                    text={topLine}
                    speed={18}
                    singleLine
                    instant
                    className="footer-dynamic-line"
                  />
                ) : (
                  <span className="footer-dynamic-line invisible" aria-hidden>
                    &nbsp;
                  </span>
                )}
              </div>
            </div>
            <div className="app-footer-body__row app-footer-body__row--bottom">
              <div className="app-footer-body__row-inner mx-auto w-full max-w-[23.2rem] min-w-0 flex-1">
                <QuickTestFooterProgress
                  current={progressCurrent}
                  total={progressTotal}
                  hidden={!showProgress}
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className="shrink-0 bg-[var(--app-footer-bg)]"
          style={{ height: 'var(--app-footer-safe-inset)' }}
          aria-hidden
        />
      </footer>
    </div>
  )
}
