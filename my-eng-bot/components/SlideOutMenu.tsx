'use client'

import React from 'react'
import type { Settings, UsageInfo } from '@/lib/types'
import MenuSectionPanels, { type MenuView } from '@/components/MenuSectionPanels'

interface SlideOutMenuProps {
  open: boolean
  onToggle: () => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  dialogueCorrectAnswers: number
  onNewDialog?: () => void
  /** Не рендерить встроенную кнопку (кнопка вынесена в шапку страницы) */
  hideButton?: boolean
  /** Кнопка «Начать …» в «Чат с MyEng» (старт или новый диалог). */
  onStartChat?: () => void
  /** Кнопка «домик»: на стартовый экран приложения. */
  onGoHome?: () => void
  /** Если чат уже идёт — при открытии меню сразу «Чат с MyEng»; если нет — корень списка разделов. */
  chatActive?: boolean
}

export default function SlideOutMenu({
  open,
  onToggle,
  settings,
  onSettingsChange,
  usage,
  dialogueCorrectAnswers,
  onNewDialog,
  hideButton = false,
  onStartChat,
  onGoHome,
  chatActive = false,
}: SlideOutMenuProps) {
  const [menuView, setMenuView] = React.useState<MenuView>('root')

  React.useLayoutEffect(() => {
    if (!open) {
      setMenuView('root')
      return
    }
    setMenuView(chatActive ? 'aiChat' : 'root')
  }, [open, chatActive])

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={onToggle}
          className="btn-3d-menu fixed z-[60] flex h-14 w-14 min-w-[44px] min-h-[44px] items-center justify-center rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--bg)] text-[var(--text)] touch-manipulation left-0 top-0"
          style={{ marginLeft: 'env(safe-area-inset-left)', marginTop: 'env(safe-area-inset-top)' }}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          title={open ? 'Закрыть меню' : 'Открыть меню'}
        >
          <MenuIcon />
        </button>
      )}

      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
        onClick={onToggle}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-[var(--bg)] border-r border-[var(--border)] shadow-lg transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Меню"
      >
        <div className="flex h-full flex-col p-2.5 pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))]">
          {onNewDialog && (
            <button
              type="button"
              onClick={() => {
                onNewDialog()
                onToggle()
              }}
              className="group mb-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] py-3 px-4 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95"
            >
              <NewChatIcon />
              <span>Новый чат</span>
            </button>
          )}

          <MenuSectionPanels
            menuView={menuView}
            onMenuViewChange={setMenuView}
            settings={settings}
            onSettingsChange={onSettingsChange}
            usage={usage}
            dialogueCorrectAnswers={dialogueCorrectAnswers}
            idPrefix="slide-"
            className="flex min-h-0 flex-1 flex-col"
            onStartHomeChat={onStartChat}
            onGoHome={onGoHome}
          />
        </div>
      </aside>
    </>
  )
}

export function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function HomeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}

function NewChatIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}
