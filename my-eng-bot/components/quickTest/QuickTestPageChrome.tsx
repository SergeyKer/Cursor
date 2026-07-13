'use client'

import { AppIconFrame } from '@/components/AppIconFrame'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

const LOGO_SRC = '/engvo-logo-1024-plus5-eqletters.png'

type QuickTestPageChromeProps = {
  showExit?: boolean
  onExit?: () => void
  children: React.ReactNode
  footerDynamic?: string
  footerStatic?: string
}

export function QuickTestPageChrome({
  showExit = false,
  onExit,
  children,
  footerDynamic = '',
  footerStatic = '',
}: QuickTestPageChromeProps) {
  return (
    <div className="quick-test-root flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)]">
      <header
        className="app-header-surface sticky top-0 z-[65] border-b border-[var(--app-header-border)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
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

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>

      <footer
        className="pointer-events-none border-t border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-[var(--bg)] px-3 py-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        aria-hidden
      >
        <div className="chat-shell-x mx-auto flex max-w-xl flex-col gap-0.5 text-[13px] leading-snug">
          {footerDynamic ? (
            <div className="text-[var(--text-accent,var(--text))] opacity-90">{footerDynamic}</div>
          ) : null}
          {footerStatic ? (
            <div className="text-[var(--text-secondary,var(--text))] opacity-70">{footerStatic}</div>
          ) : null}
        </div>
      </footer>
    </div>
  )
}
