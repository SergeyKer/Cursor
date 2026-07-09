'use client'

import TypingText from './TypingText'
import EmojiLeadingStatText from './EmojiLeadingStatText'
import { formatFooterDynamicLine, type FooterVoiceEmphasis, type FooterVoiceTone } from '@/lib/footerVoice'
import { resolveFooterPresentation } from '@/lib/footerPresentation'
import MedalBadge from '@/components/MedalBadge'
import { medalTierEmoji } from '@/lib/medalBadge'
import {
  FOOTER_STAT_GLYPH_CLASS,
  FOOTER_STAT_VALUE_CLASS,
  TRUNCATE_X_CLASS,
} from '@/lib/emojiText'
import { splitFooterStaticSegments } from '@/lib/footerStaticSegments'
import type { FooterSheetSource } from '@/lib/footerSheet'
import type {
  LessonFooterAccountSegment,
  LessonFooterMedalVisual,
  LessonFooterSegment,
} from '@/lib/lessonFooter'
import type { Audience } from '@/lib/types'

type FooterRowSheetSource = Exclude<FooterSheetSource, 'language-note'>

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
  /** Без эмодзи-маркера у динамической строки (звонок Engvo и т.п.). */
  hideDynamicMarker?: boolean
  /** Без посимвольной анимации динамической строки (стартовый экран). */
  instantDynamicText?: boolean
  onFooterRowPress?: (source: FooterRowSheetSource) => void
}

function normalizeFooterText(text?: string | null): string {
  return typeof text === 'string' ? text.trim() : ''
}

function liveFooterSegmentClassName(segment: LessonFooterSegment): string {
  if (segment.kind === 'goal') {
    return 'flex shrink-0 items-center justify-start overflow-visible'
  }
  if (segment.kind === 'xp' || segment.kind === 'combo') {
    return 'flex min-w-0 items-center justify-start overflow-visible'
  }
  if (segment.medalVisual?.mode === 'progress') {
    return 'flex min-w-0 items-center justify-start overflow-visible'
  }
  return 'flex shrink-0 items-center justify-start overflow-visible'
}

function LessonFooterMedalContent({
  visual,
  title,
  fallbackText,
  allowTextShrink = false,
}: {
  visual?: LessonFooterMedalVisual
  title?: string
  fallbackText: string
  allowTextShrink?: boolean
}) {
  if (!visual) {
    return <span className={`${TRUNCATE_X_CLASS} text-left`}>{fallbackText}</span>
  }

  if (visual.mode === 'frozen') {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center justify-start gap-1.5 overflow-visible">
        <MedalBadge frozen={visual.glyph} size="sm" title={visual.title ?? title} />
      </span>
    )
  }

  if (visual.mode === 'tier') {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center justify-start gap-1.5 overflow-visible">
        <MedalBadge tier={visual.tier} size="sm" muted={visual.muted} title={title} />
      </span>
    )
  }

  if (visual.mode === 'progress') {
    const textShrinkClass = allowTextShrink ? `${TRUNCATE_X_CLASS} min-w-0` : 'shrink-0'
    return (
      <span
        className="inline-flex max-w-full min-w-0 items-center justify-start gap-1.5 overflow-visible"
        title={title}
        aria-label={title}
      >
        <span className="shrink-0 text-[13px] leading-none text-slate-600 sm:text-sm">До </span>
        <span className={`${FOOTER_STAT_GLYPH_CLASS} shrink-0`} aria-hidden>
          {medalTierEmoji(visual.nextTier)}
        </span>
        <span
          className={`${textShrinkClass} tabular-nums text-slate-600 ${FOOTER_STAT_VALUE_CLASS}`}
        >
          : {visual.progressPercent}%
        </span>
        {visual.hintText ? (
          <span
            className={`${textShrinkClass} font-medium text-slate-600 ${FOOTER_STAT_VALUE_CLASS}`}
          >
            {visual.hintText}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <EmojiLeadingStatText
      text={visual.hintText ?? fallbackText}
      allowTextShrink={allowTextShrink}
    />
  )
}

function footerStatHighlight(segment: string): string {
  return segment.includes('(+') ? 'font-medium text-emerald-600' : ''
}

const FOOTER_TOP_ROW_CLASS = 'app-footer-body__row app-footer-body__row--top'
const FOOTER_BOTTOM_ROW_CLASS = 'app-footer-body__row app-footer-body__row--bottom'
const FOOTER_STAT_PAIR_CLASS = 'footer-stat-pair'

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
  hideDynamicMarker = false,
  instantDynamicText = false,
  onFooterRowPress,
}: AppFooterProps) {
  const topLine = formatFooterDynamicLine(normalizeFooterText(dynamicText))
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
    hideDynamicMarker,
  })
  const footerRowPressClassName = onFooterRowPress
    ? 'pointer-events-auto cursor-pointer touch-manipulation'
    : ''

  return (
    <div
      className="chat-shell-x app-footer-root pointer-events-none w-full shrink-0"
      aria-hidden={!showFooterContent}
    >
      <div
        className={`app-footer-body mx-auto w-full min-w-0 ${
          isDialogStarted
            ? 'max-w-[29rem]'
            : lessonFooterMode
              ? 'max-w-[23.2rem] max-[420px]:max-w-none'
              : 'max-w-[23.2rem]'
        } ${lessonFooterMode ? 'px-1.5 sm:px-3' : 'px-2 sm:px-3'}`}
      >
        <div
          className={`${FOOTER_TOP_ROW_CLASS} ${showFooterContent ? '' : 'opacity-0'} ${footerRowPressClassName}`}
          suppressHydrationWarning
          role={onFooterRowPress && showFooterContent ? 'button' : undefined}
          tabIndex={onFooterRowPress && showFooterContent ? 0 : undefined}
          aria-label={onFooterRowPress && showFooterContent ? 'Подсказка' : undefined}
          onClick={
            onFooterRowPress && showFooterContent
              ? () => onFooterRowPress('dynamic')
              : undefined
          }
          onKeyDown={
            onFooterRowPress && showFooterContent
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onFooterRowPress('dynamic')
                  }
                }
              : undefined
          }
        >
          {showFooterContent && topLine ? (
            <div className={`app-footer-body__row-inner ${presentation.topLineRowClassName} min-w-0 flex-1`}>
              {presentation.markerKind === 'emoji' && presentation.markerText ? (
                <span className={presentation.markerClassName} aria-hidden>
                  {presentation.markerText}
                </span>
              ) : null}
              <TypingText
                key={typingKey ?? topLine}
                text={topLine}
                speed={presentation.typingSpeed}
                singleLine
                instant={instantDynamicText}
                className={presentation.topLineClassName}
              />
            </div>
          ) : (
            <div className={`app-footer-body__row-inner ${presentation.topLineRowClassName} min-w-0 flex-1`} aria-hidden>
              <span className={`${presentation.markerClassName} invisible shrink-0`} aria-hidden>
                &nbsp;
              </span>
              <span className="footer-dynamic-line invisible">&nbsp;</span>
            </div>
          )}
        </div>
        <div
          className={`${FOOTER_BOTTOM_ROW_CLASS} ${showFooterContent ? '' : 'opacity-0'} ${footerRowPressClassName}`}
          suppressHydrationWarning
          role={onFooterRowPress && showFooterContent ? 'button' : undefined}
          tabIndex={onFooterRowPress && showFooterContent ? 0 : undefined}
          aria-label={onFooterRowPress && showFooterContent ? 'Статистика' : undefined}
          onClick={
            onFooterRowPress && showFooterContent
              ? () => onFooterRowPress('static')
              : undefined
          }
          onKeyDown={
            onFooterRowPress && showFooterContent
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onFooterRowPress('static')
                  }
                }
              : undefined
          }
        >
          {showFooterContent ? (
            <div
              className={`app-footer-body__row-inner gap-2 ${presentation.bottomLineRowClassName} ${presentation.bottomLineClassName}`}
              suppressHydrationWarning
            >
              {lessonFooterMode ? (
                <>
                  <div
                    className="live-footer-stats-row flex min-w-0 flex-1 items-center justify-between gap-0.5 overflow-visible tabular-nums sm:gap-1.5"
                    title={lessonFooterLessonTitle ?? bottomLineTitle}
                  >
                    {(lessonFooterSegments ?? []).map((segment) => {
                      const highlight = footerStatHighlight(segment.text)
                      return (
                        <span
                          key={segment.kind}
                          className={liveFooterSegmentClassName(segment)}
                          title={segment.title}
                        >
                          {segment.kind === 'medal' ? (
                            <LessonFooterMedalContent
                              visual={segment.medalVisual}
                              title={segment.title}
                              fallbackText={segment.text}
                              allowTextShrink
                            />
                          ) : (
                            <EmojiLeadingStatText
                              text={segment.text}
                              highlight={highlight}
                              allowTextShrink
                              className={FOOTER_STAT_PAIR_CLASS}
                            />
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
                        <EmojiLeadingStatText
                          key={segment.kind}
                          text={segment.text}
                          className="shrink-0 whitespace-nowrap"
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : bottomSegments.length > 0 ? (
                <div
                  className="grid min-w-0 flex-1 items-center gap-1 overflow-visible whitespace-nowrap tabular-nums sm:gap-2"
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
                      <EmojiLeadingStatText
                        text={segment}
                        highlight={footerStatHighlight(segment)}
                        className={FOOTER_STAT_PAIR_CLASS}
                      />
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
            <div className="app-footer-body__row-inner" aria-hidden>
              <span>&nbsp;</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
