'use client'

import TypingText from './TypingText'
import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import { resolveFooterPresentation } from '@/lib/footerPresentation'
import { splitFooterStaticSegments } from '@/lib/footerStaticSegments'
import type { LessonFooterAccountSegment, LessonFooterSegment } from '@/lib/lessonFooter'
import type { Audience } from '@/lib/types'

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
  audience?: Audience
  lessonFooterAccount?: string | null
  lessonFooterAccountSegments?: LessonFooterAccountSegment[] | null
  lessonFooterAccountTitle?: string | null
  lessonFooterLessonTitle?: string | null
  lessonFooterSegments?: LessonFooterSegment[] | null
}

function normalizeFooterText(text?: string | null): string {
  return typeof text === 'string' ? text.trim() : ''
}

const MEDAL_EMOJI_ONLY = /^[🥇🥈🥉○]$/
const MEDAL_PROGRESS = /^([🥇🥈🥉○])→(\d+)%$/

function LessonFooterMedalContent({ text }: { text: string }) {
  const trimmed = text.trim()

  const progress = trimmed.match(MEDAL_PROGRESS)
  if (progress) {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 sm:gap-2">
        <span className="shrink-0 text-xl leading-none sm:text-2xl" aria-hidden>
          {progress[1]}
        </span>
        <span
          className="shrink-0 px-0.5 text-base font-bold leading-none text-slate-500 sm:px-1 sm:text-lg"
          aria-hidden
        >
          →
        </span>
        <span className="shrink-0 tabular-nums text-[13px] leading-tight text-slate-700 sm:text-sm">
          {progress[2]}%
        </span>
      </span>
    )
  }

  if (MEDAL_EMOJI_ONLY.test(trimmed)) {
    return (
      <span className="text-xl leading-none sm:text-2xl" aria-hidden>
        {trimmed}
      </span>
    )
  }

  return <span className="min-w-0 truncate text-center">{text}</span>
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
  audience = 'adult',
  lessonFooterAccount = null,
  lessonFooterAccountSegments = null,
  lessonFooterAccountTitle = null,
  lessonFooterLessonTitle = null,
  lessonFooterSegments = null,
}: AppFooterProps) {
  const topLine = normalizeFooterText(dynamicText)
  const bottomLine = normalizeFooterText(staticText)
  const hasLessonSegments = (lessonFooterSegments?.length ?? 0) > 0
  const lessonFooterMode = hasLessonSegments
  const hasAccountSegments = (lessonFooterAccountSegments?.length ?? 0) > 0
  const bottomSegments = lessonFooterMode ? [] : splitFooterStaticSegments(bottomLine)
  const bottomLineTitle = bottomSegments.length > 0 ? bottomSegments.join(' · ') : bottomLine
  const showFooterContent =
    (isLessonActive || isDialogStarted || showWhenIdle) &&
    (topLine.length > 0 ||
      bottomLine.length > 0 ||
      hasLessonSegments ||
      Boolean(lessonFooterAccount))
  const showVariantProgress = Boolean(variantProgress && variantProgress.total > 1 && showFooterContent)
  const presentation = resolveFooterPresentation({
    audience,
    tone: dynamicTone,
    emphasis: dynamicEmphasis,
    typingKey,
    text: topLine,
  })

  return (
    <div
      className="chat-shell-x flex min-h-[var(--app-footer-row-height)] w-full items-stretch"
      aria-hidden={!showFooterContent}
    >
      <div
        className={`mx-auto flex w-full min-w-0 flex-col justify-center ${
          isDialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'
        } px-2 py-2 sm:px-3 sm:py-3`}
      >
        <div className={`mb-2 min-h-6 overflow-hidden ${showFooterContent ? '' : 'opacity-0'}`}>
          {showFooterContent && topLine ? (
            <div className={presentation.topLineRowClassName}>
              {presentation.markerKind === 'emoji' && presentation.markerText ? (
                <span className={presentation.markerClassName} aria-hidden>
                  {presentation.markerText}
                </span>
              ) : presentation.markerKind === 'dot' ? (
                <span className={presentation.markerClassName} aria-hidden />
              ) : null}
              <TypingText
                key={typingKey ?? topLine}
                text={topLine}
                speed={presentation.typingSpeed}
                singleLine
                className={presentation.topLineClassName}
              />
            </div>
          ) : (
            <div className="h-6" aria-hidden />
          )}
        </div>
        <div
          className={`flex w-full min-w-0 items-center overflow-hidden ${
            lessonFooterMode ? 'min-h-9 h-9' : 'h-8'
          } ${presentation.bottomLineRowClassName} ${presentation.bottomLineClassName} ${
            showFooterContent ? '' : 'opacity-0'
          }`}
        >
          {showFooterContent ? (
            <div className="flex w-full min-w-0 items-center gap-2">
              {lessonFooterMode ? (
                <>
                  <div
                    className="grid min-w-0 flex-1 grid-cols-4 items-center gap-1 tabular-nums sm:gap-2"
                    title={lessonFooterLessonTitle ?? bottomLineTitle}
                  >
                    {(lessonFooterSegments ?? []).map((segment) => {
                      const highlight =
                        (segment.kind === 'xp' || segment.kind === 'combo') &&
                        segment.text.includes('(+')
                          ? 'font-medium text-emerald-600'
                          : ''
                      return (
                        <span
                          key={segment.kind}
                          className={`flex min-w-0 items-center justify-center px-0.5 text-[13px] leading-tight sm:text-sm ${highlight}`}
                          title={segment.title}
                        >
                          {segment.kind === 'medal' ? (
                            <LessonFooterMedalContent text={segment.text} />
                          ) : (
                            <span className="min-w-0 truncate text-center">{segment.text}</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                  {hasAccountSegments ? (
                    <div
                      className="flex shrink-0 items-center gap-3 pl-2 pr-3 text-[11px] text-slate-500 sm:gap-3.5 sm:pr-4 sm:text-xs"
                      title={lessonFooterAccountTitle ?? lessonFooterAccount ?? undefined}
                    >
                      {(lessonFooterAccountSegments ?? []).map((segment) => (
                        <span key={segment.kind} className="shrink-0 whitespace-nowrap tabular-nums">
                          {segment.text}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : bottomSegments.length > 0 ? (
                <div
                  className="grid min-w-0 flex-1 gap-0"
                  style={{
                    gridTemplateColumns: `repeat(${bottomSegments.length}, minmax(0, 1fr))`,
                  }}
                  title={bottomLineTitle}
                >
                  {bottomSegments.map((segment, index) => (
                    <span key={`footer-seg-${index}`} className="min-w-0 truncate text-center">
                      {segment}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="min-w-0 flex-1 truncate" title={bottomLineTitle} aria-hidden>
                  &nbsp;
                </span>
              )}
              {!lessonFooterMode && showVariantProgress && variantProgress && (
                <div className="flex shrink-0 items-center gap-1" aria-label="Прогресс вариантов упражнения">
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
