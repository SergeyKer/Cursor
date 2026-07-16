'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppIconFrame } from '@/components/AppIconFrame'
import { MenuToggleIcon } from '@/components/MenuToggleIcon'
import { QuickTestAppMenu } from '@/components/quickTest/QuickTestAppMenu'
import TypingText from '@/components/TypingText'
import EmojiLeadingStatText from '@/components/EmojiLeadingStatText'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import {
  applyChatPatternToDocument,
  type ChatPatternId,
  isChatPatternId,
} from '@/lib/chatPattern'
import { isIosSafariUserAgent } from '@/lib/iosSafariViewport'
import { formatFooterDynamicLine } from '@/lib/footerVoice'
import { resolveFooterPresentation } from '@/lib/footerPresentation'
import type { FooterVoiceTone } from '@/lib/footerVoice'

const LOGO_SRC = '/engvo-logo-1024-plus5-eqletters.png'
const QUICK_TEST_PATTERN: ChatPatternId = 'study-doodles'
const IOS_SAFARI_DIALOG_ATTR = 'data-ios-safari-dialog'

type QuickTestPageChromeProps = {
  /** Перед уходом из активного прогона теста. false — отменить навигацию. */
  onLeaveTest?: () => boolean
  /** DEBUG: сразу к финалу быстрого теста. */
  onDebugSkipToQuickTestFinale?: () => void
  quickTestSessionActiveForDebug?: boolean
  quickTestLobbyActiveForDebug?: boolean
  /** Перезапуск intro на /test (пункт меню «Быстрый тест»). */
  onOpenQuickTest?: () => void
  children: React.ReactNode
  footerDynamic?: string
  footerStatic?: string
  footerTone?: FooterVoiceTone
  footerTypingKey?: string
  progress?: { current: number; total: number } | null
}

function QuickTestFooterProgress({
  current,
  total,
  hidden,
  staticLabel,
}: {
  current: number
  total: number
  hidden?: boolean
  staticLabel?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(1, total)) * 100)))
  return (
    <div
      className="flex h-full min-h-0 w-full items-center gap-2 px-3"
      aria-hidden={hidden ? true : undefined}
      style={hidden ? { visibility: 'hidden' } : undefined}
    >
      {staticLabel ? (
        <EmojiLeadingStatText text={staticLabel} className="footer-stat-pair shrink-0" />
      ) : null}
      <div
        className="min-w-0 flex-1"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={staticLabel || `Шаг ${current} из ${total}`}
      >
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-[var(--text-accent,#4f8fe8)] transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function QuickTestPageChrome({
  onLeaveTest,
  onDebugSkipToQuickTestFinale,
  quickTestSessionActiveForDebug = false,
  quickTestLobbyActiveForDebug = false,
  onOpenQuickTest,
  children,
  footerDynamic = '',
  footerStatic = '',
  footerTone = 'hint',
  footerTypingKey,
  progress = null,
}: QuickTestPageChromeProps) {
  const appColumnRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (menuOpen) {
      root.setAttribute('data-menu-open', '')
    } else {
      root.removeAttribute('data-menu-open')
    }
    return () => {
      root.removeAttribute('data-menu-open')
    }
  }, [menuOpen])

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
  const bottomLine = footerStatic.trim()
  const presentation = resolveFooterPresentation({
    audience: 'adult',
    tone: footerTone,
    emphasis: 'none',
    typingKey: footerTypingKey ?? topLine,
    text: topLine,
  })

  const handleDebugSkipToQuickTestFinale = useCallback(() => {
    setMenuOpen(false)
    onDebugSkipToQuickTestFinale?.()
  }, [onDebugSkipToQuickTestFinale])

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
        <div className="chat-shell-x flex w-full min-h-[var(--app-header-row-height)] items-center">
          <div
            ref={appColumnRef}
            className="relative mx-auto grid w-full max-w-[29rem] grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 sm:grid-cols-[2.5rem_1fr_auto]"
          >
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="app-header-control chat-action-button pointer-events-auto relative z-20 col-start-1 row-start-1 flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation"
              style={{ borderRadius: 'var(--app-header-control-radius)' }}
              aria-label={menuOpen ? 'Меню, открыто' : 'Меню, закрыто'}
              aria-expanded={menuOpen}
              title={menuOpen ? 'Меню, открыто' : 'Меню, закрыто'}
            >
              <MenuToggleIcon />
            </button>
            <h1
              className="app-header-title-layer col-start-2 min-w-0 truncate px-2 text-center text-[16px] font-semibold leading-[1.32] text-[var(--app-header-text)] sm:text-[17px]"
              style={{ fontFamily: 'var(--app-header-font-family)' }}
            >
              {QUICK_TEST_COPY.headerTitle}
            </h1>
            <div className="relative z-20 col-start-3 row-start-1 flex h-10 min-h-[36px] shrink-0 items-center justify-end gap-1 justify-self-end">
              <AppIconFrame variant="header" src={LOGO_SRC} alt="Engvo" />
            </div>
          </div>
        </div>
      </header>

      <QuickTestAppMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((value) => !value)}
        columnRef={appColumnRef}
        onLeaveTest={onLeaveTest}
        onDebugSkipToQuickTestFinale={
          onDebugSkipToQuickTestFinale ? handleDebugSkipToQuickTestFinale : undefined
        }
        quickTestSessionActiveForDebug={quickTestSessionActiveForDebug}
        quickTestLobbyActiveForDebug={quickTestLobbyActiveForDebug}
        onOpenQuickTest={onOpenQuickTest}
      />

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
              <div
                className={`app-footer-body__row-inner mx-auto w-full max-w-[23.2rem] min-w-0 flex-1 px-2 sm:px-3 ${presentation.topLineRowClassName}`}
              >
                {topLine ? (
                  <>
                    {presentation.markerKind === 'emoji' && presentation.markerText ? (
                      <span className={presentation.markerClassName} aria-hidden>
                        {presentation.markerText}
                      </span>
                    ) : null}
                    <TypingText
                      key={footerTypingKey ?? topLine}
                      text={topLine}
                      speed={presentation.typingSpeed}
                      singleLine
                      instant
                      className={presentation.topLineClassName}
                    />
                  </>
                ) : (
                  <span className="footer-dynamic-line invisible" aria-hidden>
                    &nbsp;
                  </span>
                )}
              </div>
            </div>
            <div className="app-footer-body__row app-footer-body__row--bottom">
              <div
                className={`app-footer-body__row-inner mx-auto w-full max-w-[23.2rem] min-w-0 flex-1 ${presentation.bottomLineRowClassName}`}
              >
                <QuickTestFooterProgress
                  current={progressCurrent}
                  total={progressTotal}
                  hidden={!showProgress}
                  staticLabel={showProgress ? bottomLine : undefined}
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
