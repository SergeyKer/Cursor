'use client'

import React from 'react'
import type { Settings, UsageInfo } from '@/lib/types'
import MenuSectionPanels, { type LessonsPanel, type MenuView } from '@/components/MenuSectionPanels'
import { SLIDE_OUT_NEW_CHAT_BUTTON_CLASS } from '@/lib/homeCtaStyles'

export type LessonMenuContext = {
  menuView: 'lessons'
  lessonsPanel: LessonsPanel
}

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
  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string) => void
  /** Открыть урок из ветки «Репетитор». */
  onOpenTutorLesson?: (request: { requestedTopic: string; analysisSummary?: string }) => Promise<void> | void
  /** Контекст меню, из которого открыт урок. */
  lessonMenuContext?: LessonMenuContext | null
  /** Верхний offset (шапка + safe-area), общий с основным layout. */
  topOffset?: string
  /** Нижний offset (футер + safe-area), чтобы панель не перекрывала низ. */
  bottomOffset?: string
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
  onOpenLearningLesson,
  onOpenTutorLesson,
  lessonMenuContext,
  topOffset = 'calc(2.75rem + env(safe-area-inset-top, 0px))',
  bottomOffset = '0px',
}: SlideOutMenuProps) {
  const [menuView, setMenuView] = React.useState<MenuView>('root')

  React.useLayoutEffect(() => {
    if (!open) {
      setMenuView('root')
      return
    }
    if (chatActive && lessonMenuContext?.menuView === 'lessons') {
      setMenuView('lessons')
      return
    }
    setMenuView(chatActive ? 'aiChat' : 'root')
  }, [open, chatActive, lessonMenuContext])

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={onToggle}
          className="btn-3d-menu fixed z-[60] flex h-14 w-14 min-w-[44px] min-h-[44px] items-center justify-center rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--menu-panel-bg)] text-[var(--text)] touch-manipulation left-0 top-0"
          style={{ marginLeft: 'env(safe-area-inset-left)', marginTop: 'env(safe-area-inset-top)' }}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          title={open ? 'Закрыть меню' : 'Открыть меню'}
        >
          <MenuIcon />
        </button>
      )}

      <div
        className={`fixed left-0 right-0 bottom-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ top: topOffset, bottom: bottomOffset }}
        aria-hidden
        onClick={onToggle}
      />
      <aside
        className={`fixed left-0 z-50 w-80 max-w-[85vw] border-b border-r border-b-[var(--app-footer-border)] border-r-[var(--border)] bg-[var(--menu-panel-bg)] transition-transform duration-200 ease-out ${
          open ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        }`}
        style={{
          top: topOffset,
          bottom: bottomOffset,
          boxShadow:
            'var(--app-footer-shadow), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        }}
        aria-label="Меню"
      >
        <div className="flex h-full flex-col px-3 pb-3 pt-3">
          {onNewDialog && (
            <button
              type="button"
              onClick={() => {
                onNewDialog()
                onToggle()
              }}
              className={SLIDE_OUT_NEW_CHAT_BUTTON_CLASS}
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
            onOpenLearningLesson={onOpenLearningLesson}
            onOpenTutorLesson={onOpenTutorLesson}
            initialLessonsPanel={menuView === 'lessons' ? lessonMenuContext?.lessonsPanel : undefined}
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
