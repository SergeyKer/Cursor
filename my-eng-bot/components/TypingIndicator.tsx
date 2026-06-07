'use client'

import React from 'react'

const DEFAULT_EXIT_TRANSITION_MS = 220

type TypingIndicatorProps = {
  isVisible: boolean
  label?: string
  title?: string
  /** Без шиммера и полоски — спокойный статичный текст (напр. полоска Engvo в чате). */
  plainStatus?: boolean
  /**
   * Задержка перед снятием с дерева после скрытия. `0` — убрать без анимации выхода
   * (убирает «миг» под только что появившимся пузырём, напр. при Engvo).
   */
  exitTransitionMs?: number
}

export default function TypingIndicator({
  isVisible,
  label = 'Engvo печатает...',
  title = 'Ожидание ответа от ИИ',
  plainStatus = false,
  exitTransitionMs = DEFAULT_EXIT_TRANSITION_MS,
}: TypingIndicatorProps) {
  const [shouldRender, setShouldRender] = React.useState(isVisible)

  React.useLayoutEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      return
    }
    if (exitTransitionMs <= 0) {
      setShouldRender(false)
    }
  }, [isVisible, exitTransitionMs])

  React.useEffect(() => {
    if (isVisible || exitTransitionMs <= 0) return

    const timeoutId = window.setTimeout(() => {
      setShouldRender(false)
    }, exitTransitionMs)

    return () => window.clearTimeout(timeoutId)
  }, [isVisible, exitTransitionMs])

  if (!shouldRender) return null

  const instantExit = exitTransitionMs <= 0
  const motionShell = instantExit
    ? 'transition-none'
    : 'transition-[max-height,opacity,margin] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
  const motionInner = instantExit
    ? 'transition-none'
    : 'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'

  return (
    <div
      dir="ltr"
      aria-hidden={!isVisible}
      className={`typing-indicator-shell mt-1.5 flex justify-start overflow-hidden ${motionShell} ${
        isVisible ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
      }`}
      data-visible={isVisible ? 'true' : 'false'}
    >
      <div
        dir="ltr"
        aria-live={isVisible ? 'polite' : 'off'}
        role="status"
        className={`typing-indicator chat-section-surface glass-surface relative flex items-center overflow-hidden rounded-[var(--bubble-radius)] rounded-bl-md border px-3 py-2 text-[14px] text-[var(--text)] ${plainStatus ? 'gap-0' : 'gap-2'} ${motionInner} ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-[0.96] -translate-y-1'
        }`}
        title={title}
      >
        {!plainStatus ? <span className="typing-indicator-shimmer" aria-hidden="true" /> : null}
        <span
          className={`relative z-[1] italic ${plainStatus ? '' : 'typing-indicator-text-shimmer'}`}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
