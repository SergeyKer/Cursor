'use client'

import AppFooter from '@/components/AppFooter'
import FooterDetailSheet, { type FooterDetailSheetHandle } from '@/components/FooterDetailSheet'
import { useAppColumnBounds } from '@/hooks/useAppColumnBounds'
import {
  buildFooterSheetContext,
  shouldCloseFooterSheetOnRowPress,
  type FooterSheetContext,
  type FooterSheetSource,
} from '@/lib/footerSheet'
import { useCallback, useRef, useState } from 'react'
import { MenuToggleIcon } from '@/components/MenuToggleIcon'
import { START_RUNTIME_COPY } from '@/lib/uiCopy/startRuntimeCopy'
import {
  createFooterSsrPlaceholderRewardsState,
  formatGlobalFooterStats,
} from '@/lib/rewardsState'

const START_FOOTER_STATIC = formatGlobalFooterStats(createFooterSsrPlaceholderRewardsState())
const START_FOOTER_DYNAMIC = 'Я снова здесь. Продолжим?'

export type StartPageChromeProps = {
  onMenuClick?: () => void
  title?: string
  menuDisabled?: boolean
  appShellLoadState?: 'pending' | 'ready' | 'error'
  onRetryAppShellLoad?: () => void
}

export default function StartPageChrome({
  onMenuClick,
  title = 'Engvo AI - English Voice',
  menuDisabled = false,
  appShellLoadState = 'pending',
  onRetryAppShellLoad,
}: StartPageChromeProps) {
  const appColumnRef = useRef<HTMLDivElement | null>(null)
  const footerSheetRef = useRef<FooterDetailSheetHandle>(null)
  const [footerSheetContext, setFooterSheetContext] = useState<FooterSheetContext | null>(null)
  const columnBounds = useAppColumnBounds(appColumnRef, {
    remeasureWhen: Boolean(footerSheetContext),
  })

  const handleFooterRowPress = useCallback(
    (source: Exclude<FooterSheetSource, 'language-note' | 'call-review'>) => {
      if (shouldCloseFooterSheetOnRowPress(footerSheetContext, source)) {
        footerSheetRef.current?.close()
        return
      }
      setFooterSheetContext(
        buildFooterSheetContext({
          source,
          dynamicText: START_FOOTER_DYNAMIC,
          staticText: START_FOOTER_STATIC,
          typingKey: 'start-footer-placeholder',
        })
      )
    },
    [footerSheetContext]
  )

  return (
    <>
      <header
        className="app-header-surface fixed left-0 right-0 top-0 z-[65] border-b border-[var(--app-header-border)]"
        style={{ paddingTop: 'var(--app-safe-top-inset)' }}
      >
        <div className="chat-shell-x flex w-full min-h-[var(--app-header-row-height)] items-center">
          <div
            ref={appColumnRef}
            className="relative mx-auto grid w-full max-w-[23.2rem] grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2"
          >
            <button
              type="button"
              onClick={onMenuClick}
              disabled={menuDisabled}
              className="app-header-control chat-action-button pointer-events-auto relative z-20 col-start-1 row-start-1 flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation disabled:opacity-50"
              style={{ borderRadius: 'var(--app-header-control-radius)' }}
              aria-label="Меню"
              title={menuDisabled ? 'Меню скоро будет доступно' : 'Меню'}
            >
              <MenuToggleIcon />
            </button>
            <h1
              className="app-header-title-layer gap-1 px-2 text-[16px] font-semibold leading-[1.32] tracking-normal text-[var(--app-header-text)] whitespace-nowrap sm:text-[17px]"
              style={{ fontFamily: 'var(--app-header-font-family)' }}
            >
              <span className="truncate">{title}</span>
            </h1>
            <div className="col-start-3 row-start-1" aria-hidden />
          </div>
        </div>
      </header>

      {appShellLoadState === 'error' ? (
        <div
          className="fixed left-0 right-0 z-[60] flex justify-center px-4"
          style={{ top: 'var(--app-top-offset)' }}
        >
          <div className="glass-surface max-w-[23.2rem] rounded-[1rem] border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)] px-4 py-3 text-center shadow-sm">
            <p className="text-[14px] leading-relaxed text-[var(--text-muted)]">
              {START_RUNTIME_COPY.appShellLoadError}
            </p>
            {onRetryAppShellLoad ? (
              <button
                type="button"
                onClick={onRetryAppShellLoad}
                className="mt-3 rounded-full border border-[var(--app-header-control-border)] px-4 py-2 text-[13px] font-semibold text-[var(--text)]"
              >
                {START_RUNTIME_COPY.retryLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="app-dialog-chrome-footer pointer-events-none fixed bottom-0 left-0 right-0 z-[55] flex flex-col overflow-visible">
        <div className="app-footer-surface h-[var(--app-footer-row-height)] min-h-[var(--app-footer-row-height)] shrink-0 border-t border-[var(--app-footer-border)]">
          <AppFooter
            staticText={START_FOOTER_STATIC}
            dynamicText={START_FOOTER_DYNAMIC}
            typingKey="start-footer-placeholder"
            showWhenIdle
            instantDynamicText
            onFooterRowPress={handleFooterRowPress}
          />
        </div>
        <div
          className="shrink-0 bg-[var(--app-footer-bg)]"
          style={{ height: 'var(--app-footer-safe-inset)' }}
          aria-hidden
        />
      </footer>

      <FooterDetailSheet
        ref={footerSheetRef}
        context={footerSheetContext}
        columnBounds={columnBounds}
        onClose={() => setFooterSheetContext(null)}
      />
    </>
  )
}
