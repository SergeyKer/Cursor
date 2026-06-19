'use client'

import AppFooter from '@/components/AppFooter'
import { MenuToggleIcon } from '@/components/MenuToggleIcon'
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
}

export default function StartPageChrome({
  onMenuClick,
  title = 'Engvo AI - English Voice',
  menuDisabled = false,
}: StartPageChromeProps) {
  return (
    <>
      <header
        className="app-header-surface fixed left-0 right-0 top-0 z-[65] border-b border-[var(--app-header-border)]"
        style={{ paddingTop: 'var(--app-safe-top-inset)' }}
      >
        <div className="chat-shell-x flex w-full min-h-[var(--app-header-row-height)] items-center">
          <div className="relative mx-auto grid w-full max-w-[23.2rem] grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2">
            <button
              type="button"
              onClick={onMenuClick}
              disabled={menuDisabled}
              className="app-header-control chat-action-button pointer-events-auto relative z-20 col-start-1 row-start-1 flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation disabled:opacity-50"
              style={{ borderRadius: 'var(--app-header-control-radius)' }}
              aria-label={menuDisabled ? 'Меню, загрузка' : 'Меню'}
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

      <footer className="app-dialog-chrome-footer pointer-events-none fixed bottom-0 left-0 right-0 z-[55] flex flex-col overflow-visible">
        <div className="app-footer-surface h-[var(--app-footer-row-height)] min-h-[var(--app-footer-row-height)] shrink-0 border-t border-[var(--app-footer-border)]">
          <AppFooter
            staticText={START_FOOTER_STATIC}
            dynamicText={START_FOOTER_DYNAMIC}
            typingKey="start-footer-placeholder"
            showWhenIdle
          />
        </div>
        <div
          className="shrink-0 bg-[var(--app-header-bg)]"
          style={{ height: 'var(--app-footer-safe-inset)' }}
          aria-hidden
        />
      </footer>
    </>
  )
}
