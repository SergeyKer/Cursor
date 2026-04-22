'use client'

import React from 'react'

const EXIT_TRANSITION_MS = 220

type TypingIndicatorProps = {
  isVisible: boolean
  label?: string
  title?: string
}

export default function TypingIndicator({
  isVisible,
  label = 'MyEng печатает...',
  title = 'Ожидание ответа от ИИ',
}: TypingIndicatorProps) {
  const [shouldRender, setShouldRender] = React.useState(isVisible)

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRender(false)
    }, EXIT_TRANSITION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isVisible])

  if (!shouldRender) return null

  return (
    <div
      dir="ltr"
      aria-hidden={!isVisible}
      className={`typing-indicator-shell mt-1.5 flex justify-start overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        isVisible ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
      }`}
      data-visible={isVisible ? 'true' : 'false'}
    >
      <div
        dir="ltr"
        aria-live={isVisible ? 'polite' : 'off'}
        role="status"
        className={`typing-indicator chat-section-surface glass-surface relative flex items-center gap-2 overflow-hidden rounded-[var(--bubble-radius)] rounded-bl-md border px-3 py-2 text-[14px] text-[var(--text)] transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-[0.96] -translate-y-1'
        }`}
        title={title}
      >
        <span className="typing-indicator-shimmer" aria-hidden="true" />
        <span className="relative z-[1] italic typing-indicator-text-shimmer">{label}</span>
      </div>
    </div>
  )
}
