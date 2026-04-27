'use client'

import TypingText from './TypingText'

type AppFooterProps = {
  dynamicText?: string | null
  staticText?: string | null
  typingKey?: string | number | null
  isLessonActive?: boolean
  isDialogStarted?: boolean
}

function normalizeFooterText(text?: string | null): string {
  return typeof text === 'string' ? text.trim() : ''
}

export default function AppFooter({
  dynamicText,
  staticText,
  typingKey,
  isLessonActive = false,
  isDialogStarted = false,
}: AppFooterProps) {
  const topLine = normalizeFooterText(dynamicText)
  const bottomLine = normalizeFooterText(staticText)
  const showLessonContent = isLessonActive && (topLine.length > 0 || bottomLine.length > 0)

  return (
    <div
      className="chat-shell-x flex min-h-[var(--app-footer-row-height)] w-full items-stretch"
      aria-hidden={!showLessonContent}
    >
      <div
        className={`mx-auto flex w-full flex-col justify-center ${
          isDialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'
        } px-2 py-2 sm:px-3 sm:py-3`}
      >
        <div className={`mb-2 min-h-6 overflow-hidden ${showLessonContent ? '' : 'opacity-0'}`}>
          {showLessonContent && topLine ? (
            <TypingText key={typingKey ?? topLine} text={topLine} speed={40} />
          ) : (
            <div className="h-6" aria-hidden />
          )}
        </div>
        <div
          className={`flex h-8 items-center overflow-hidden text-[10px] font-medium text-gray-400 sm:text-xs ${
            showLessonContent ? '' : 'opacity-0'
          }`}
        >
          {showLessonContent ? <span className="truncate">{bottomLine}</span> : <span aria-hidden>&nbsp;</span>}
        </div>
      </div>
    </div>
  )
}
