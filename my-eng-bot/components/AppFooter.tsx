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
  const lessonFooterMode = Boolean(
    lessonFooterAccount && ((lessonFooterSegments?.length ?? 0) > 0 || bottomLine.length > 0)
  )
  const bottomSegments = lessonFooterMode ? [] : splitFooterStaticSegments(bottomLine)
  const bottomLineTitle = bottomSegments.length > 0 ? bottomSegments.join(' · ') : bottomLine
  const showFooterContent =
    (isLessonActive || isDialogStarted || showWhenIdle) &&
    (topLine.length > 0 ||
      bottomLine.length > 0 ||
      (lessonFooterSegments?.length ?? 0) > 0 ||
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
          className={`flex h-8 w-full min-w-0 items-center overflow-hidden ${presentation.bottomLineRowClassName} ${presentation.bottomLineClassName} ${
            showFooterContent ? '' : 'opacity-0'
          }`}
        >
          {showFooterContent ? (
            <div className="flex w-full min-w-0 items-center gap-2">
              {lessonFooterMode ? (
                <>
                  <div
                    className="flex min-w-0 flex-1 items-stretch divide-x divide-slate-200/80 overflow-hidden border-r border-slate-200/80 text-[11px] tabular-nums sm:text-xs"
                    title={lessonFooterLessonTitle ?? bottomLineTitle}
                  >
                    {(lessonFooterSegments ?? []).map((segment) => (
                      <span
                        key={segment.kind}
                        className={`flex min-w-0 flex-1 basis-0 items-center justify-center px-2 ${
                          segment.kind === 'medal' ? 'text-base leading-none' : ''
                        } ${
                          segment.kind === 'core' && segment.text.includes('(+')
                            ? 'font-medium text-emerald-600'
                            : ''
                        }`}
                        title={segment.title}
                      >
                        <span className="min-w-0 truncate text-center">{segment.text}</span>
                      </span>
                    ))}
                    {!lessonFooterSegments?.length && bottomLine ? (
                      <span className="min-w-0 flex-1 truncate px-2 text-center">{bottomLine}</span>
                    ) : null}
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-3 pl-2 pr-3 text-[11px] text-slate-500 sm:gap-3.5 sm:pr-4 sm:text-xs"
                    title={lessonFooterAccountTitle ?? lessonFooterAccount ?? undefined}
                  >
                    {(lessonFooterAccountSegments ?? []).map((segment) => (
                      <span key={segment.kind} className="shrink-0 whitespace-nowrap tabular-nums">
                        {segment.text}
                      </span>
                    ))}
                    {!lessonFooterAccountSegments?.length && lessonFooterAccount ? (
                      <span className="shrink-0 whitespace-nowrap">{lessonFooterAccount}</span>
                    ) : null}
                  </div>
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
