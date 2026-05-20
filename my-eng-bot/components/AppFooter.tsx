'use client'

import TypingText from './TypingText'
import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import { resolveFooterPresentation } from '@/lib/footerPresentation'
import MedalBadge from '@/components/MedalBadge'
import { medalTierEmoji } from '@/lib/medalBadge'
import {
  EMOJI_LINE_CLASS,
  FOOTER_STAT_GLYPH_CLASS,
  TRUNCATE_X_CLASS,
  splitLeadingEmoji,
} from '@/lib/emojiText'
import { splitFooterStaticSegments } from '@/lib/footerStaticSegments'
import type {
  LessonFooterAccountSegment,
  LessonFooterMedalVisual,
  LessonFooterSegment,
} from '@/lib/lessonFooter'
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

function LessonFooterMedalContent({
  visual,
  title,
  fallbackText,
}: {
  visual?: LessonFooterMedalVisual
  title?: string
  fallbackText: string
}) {
  if (!visual) {
    return <span className={`${TRUNCATE_X_CLASS} text-left`}>{fallbackText}</span>
  }

  if (visual.mode === 'tier') {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center justify-start gap-0.5 overflow-visible">
        <MedalBadge tier={visual.tier} size="sm" muted={visual.muted} title={title} />
      </span>
    )
  }

  if (visual.mode === 'progress') {
    return (
      <span
        className="inline-flex max-w-full min-w-0 items-center justify-start gap-0.5 overflow-visible"
        title={title}
        aria-label={title}
      >
        <span className="shrink-0 text-[13px] leading-none text-slate-600 sm:text-sm">До </span>
        <span className={`${FOOTER_STAT_GLYPH_CLASS} shrink-0`} aria-hidden>
          {medalTierEmoji(visual.nextTier)}
        </span>
        <span className="shrink-0 tabular-nums text-[13px] leading-none text-slate-600 sm:text-sm">
          : {visual.progressPercent}%
        </span>
        {visual.hintText ? (
          <span className="shrink-0 text-[13px] font-medium leading-none text-slate-600 sm:text-sm">
            {visual.hintText}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span className={`${TRUNCATE_X_CLASS} text-left text-[13px] sm:text-sm ${EMOJI_LINE_CLASS}`}>
      {visual.hintText}
    </span>
  )
}

function footerStatHighlight(segment: string): string {
  return segment.includes('(+') ? 'font-medium text-emerald-600' : ''
}

function FooterStatSegmentText({ text, highlight = '' }: { text: string; highlight?: string }) {
  const parts = splitLeadingEmoji(text)
  if (parts) {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center justify-start gap-0.5 overflow-visible">
        <span className={`${FOOTER_STAT_GLYPH_CLASS} ${highlight}`.trim()} aria-hidden>
          {parts.emoji}
        </span>
        <span
          className={`shrink-0 tabular-nums text-[13px] leading-none sm:text-sm ${highlight}`.trim()}
        >
          {parts.rest}
        </span>
      </span>
    )
  }

  return (
    <span
      className={`${TRUNCATE_X_CLASS} text-left text-[13px] sm:text-sm ${EMOJI_LINE_CLASS} ${highlight}`.trim()}
    >
      {text}
    </span>
  )
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
      className="chat-shell-x flex min-h-[var(--app-footer-row-height)] w-full flex-1 flex-col justify-center overflow-visible"
      style={{ paddingBottom: 'var(--app-bottom-inset)' }}
      aria-hidden={!showFooterContent}
    >
      <div
        className={`mx-auto flex w-full min-w-0 flex-col justify-center ${
          lessonFooterMode ? 'gap-0.5' : 'gap-1.5'
        } ${isDialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'} px-2 sm:px-3 ${
          lessonFooterMode ? 'py-0' : 'py-1.5 sm:py-2'
        }`}
      >
        <div
          className={`flex items-center overflow-visible ${
            lessonFooterMode ? 'min-h-[var(--app-header-row-height)]' : 'min-h-6'
          } ${showFooterContent ? '' : 'opacity-0'}`}
        >
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
            <div
              className={lessonFooterMode ? 'min-h-[var(--app-header-row-height)]' : 'h-6'}
              aria-hidden
            />
          )}
        </div>
        <div
          className={`flex w-full min-w-0 items-center overflow-visible min-h-[var(--app-header-row-height)] pb-1 ${presentation.bottomLineRowClassName} ${presentation.bottomLineClassName} ${showFooterContent ? '' : 'opacity-0'}`}
        >
          {showFooterContent ? (
            <div className="flex w-full min-w-0 items-center gap-2">
              {lessonFooterMode ? (
                <>
                  <div
                    className="grid min-w-0 flex-1 grid-cols-4 items-center gap-1 overflow-visible tabular-nums sm:gap-2"
                    title={lessonFooterLessonTitle ?? bottomLineTitle}
                  >
                    {(lessonFooterSegments ?? []).map((segment) => {
                      const highlight = footerStatHighlight(segment.text)
                      return (
                        <span
                          key={segment.kind}
                          className="flex min-w-0 items-center justify-start overflow-visible px-0.5"
                          title={segment.title}
                        >
                          {segment.kind === 'medal' ? (
                            <LessonFooterMedalContent
                              visual={segment.medalVisual}
                              title={segment.title}
                              fallbackText={segment.text}
                            />
                          ) : (
                            <FooterStatSegmentText text={segment.text} highlight={highlight} />
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
                  className="grid min-w-0 flex-1 items-center gap-1 overflow-visible tabular-nums sm:gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${bottomSegments.length}, minmax(0, 1fr))`,
                  }}
                  title={bottomLineTitle}
                >
                  {bottomSegments.map((segment, index) => (
                    <span
                      key={`footer-seg-${index}`}
                      className="flex min-w-0 items-center justify-start overflow-visible px-0.5"
                    >
                      <FooterStatSegmentText text={segment} highlight={footerStatHighlight(segment)} />
                    </span>
                  ))}
                </div>
              ) : (
                <span className={`min-w-0 flex-1 ${TRUNCATE_X_CLASS}`} title={bottomLineTitle} aria-hidden>
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
