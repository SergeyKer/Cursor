'use client'

import TypingText from './TypingText'
import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'

type AppFooterProps = {
  dynamicText?: string | null
  staticText?: string | null
  typingKey?: string | number | null
  isLessonActive?: boolean
  isDialogStarted?: boolean
  showWhenIdle?: boolean
  dynamicTone?: FooterVoiceTone
  dynamicEmphasis?: FooterVoiceEmphasis
  variantProgress?: {
    total: number
    current: number
  } | null
}

function normalizeFooterText(text?: string | null): string {
  return typeof text === 'string' ? text.trim() : ''
}

function getTopLineClassName(tone: FooterVoiceTone, emphasis: FooterVoiceEmphasis): string {
  const toneClassName =
    tone === 'celebrate'
      ? 'font-semibold text-emerald-700'
      : tone === 'support'
        ? 'text-emerald-700'
        : tone === 'hint'
          ? 'text-amber-700'
          : tone === 'thinking'
            ? 'text-sky-700'
            : tone === 'error'
              ? 'text-rose-700'
              : 'text-[var(--text-muted,#6b7280)]'

  return `${toneClassName} ${emphasis === 'pulse' ? 'animate-pulse' : ''}`.trim()
}

export default function AppFooter({
  dynamicText,
  staticText,
  typingKey,
  isLessonActive = false,
  isDialogStarted = false,
  showWhenIdle = false,
  dynamicTone = 'neutral',
  dynamicEmphasis = 'none',
  variantProgress = null,
}: AppFooterProps) {
  const topLine = normalizeFooterText(dynamicText)
  const bottomLine = normalizeFooterText(staticText)
  const showFooterContent = (isLessonActive || isDialogStarted || showWhenIdle) && (topLine.length > 0 || bottomLine.length > 0)
  const showVariantProgress = Boolean(variantProgress && variantProgress.total > 1 && showFooterContent)
  const topLineClassName = getTopLineClassName(dynamicTone, dynamicEmphasis)

  return (
    <div
      className="chat-shell-x flex min-h-[var(--app-footer-row-height)] w-full items-stretch"
      aria-hidden={!showFooterContent}
    >
      <div
        className={`mx-auto flex w-full flex-col justify-center ${
          isDialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'
        } px-2 py-2 sm:px-3 sm:py-3`}
      >
        <div className={`mb-2 min-h-6 overflow-hidden ${showFooterContent ? '' : 'opacity-0'}`}>
          {showFooterContent && topLine ? (
            <TypingText
              key={typingKey ?? topLine}
              text={topLine}
              speed={40}
              singleLine
              className={topLineClassName}
            />
          ) : (
            <div className="h-6" aria-hidden />
          )}
        </div>
        <div
          className={`flex h-8 items-center overflow-hidden text-[10px] font-medium text-gray-400 sm:text-xs ${
            showFooterContent ? '' : 'opacity-0'
          }`}
        >
          {showFooterContent ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{bottomLine}</span>
              {showVariantProgress && variantProgress && (
                <div className="flex items-center gap-1" aria-label="Прогресс вариантов упражнения">
                  {Array.from({ length: variantProgress.total }, (_, index) => (
                    <div
                      key={`footer-variant-${index}`}
                      className={`h-2 w-2 rounded-full transition ${
                        index < variantProgress.current
                          ? 'bg-green-400'
                          : index === variantProgress.current
                            ? 'bg-blue-400 animate-pulse'
                            : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span aria-hidden>&nbsp;</span>
          )}
        </div>
      </div>
    </div>
  )
}
