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
import { resolveFooterBottomMode } from '@/lib/footerBottomMode'
import type { FooterSheetSource } from '@/lib/footerSheet'
import type {
  LessonFooterAccountSegment,
  LessonFooterMedalVisual,
  LessonFooterSegment,
} from '@/lib/lessonFooter'
import type { Audience } from '@/lib/types'
import {
  DIALOG_SESSION_COLUMN_MAX_CLASS,
  DIALOG_SESSION_FOOTER_GUTTER_CLASS,
} from '@/lib/dialogSessionChrome'

type FooterRowSheetSource = Exclude<FooterSheetSource, 'language-note' | 'call-review' | 'lesson-hud'>

export type AppFooterSessionMeter = {
  current: number
  target: number
  sessionXp: number
  statusLabel: string
  fillPercent?: number
}

type AppFooterProps = {
  dynamicText?: string | null
  staticText?: string | null
  typingKey?: string | number | null
  isLessonActive?: boolean
  isDialogStarted?: boolean
  isDialogSessionColumn?: boolean
  showWhenIdle?: boolean
  dynamicTone?: FooterVoiceTone
  dynamicEmphasis?: FooterVoiceEmphasis
  variantProgress?: {
    total: number
    current: number
  } | null
  /** Continuous session bar (translation | dialogue | communication). XOR with lessonFooterSegments; default null. */
  sessionMeter?: AppFooterSessionMeter | null
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
  /** Lesson-hud scope: sheet-open glyph (signal only) + shared aria. */
  showLessonHudGlyph?: boolean
  footerRowAriaLabel?: string | null
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
  isDialogSessionColumn = isDialogStarted,
  showWhenIdle = false,
  dynamicTone = 'neutral',
  dynamicEmphasis = 'none',
  variantProgress = null,
  sessionMeter = null,
  audience = 'adult',
  lessonFooterAccount = null,
  lessonFooterAccountSegments = null,
  lessonFooterAccountTitle = null,
  lessonFooterLessonTitle = null,
  lessonFooterSegments = null,
  hideDynamicMarker = false,
  instantDynamicText = false,
  onFooterRowPress,
  showLessonHudGlyph = false,
  footerRowAriaLabel = null,
}: AppFooterProps) {
  const topLine = formatFooterDynamicLine(normalizeFooterText(dynamicText))
  const bottomLine = normalizeFooterText(staticText)
  const bottomMode = resolveFooterBottomMode({
    lessonFooterSegments,
    sessionMeter,
    staticText: bottomLine,
  })
  const lessonFooterMode = bottomMode === 'lesson'
  const hasSessionMeter = bottomMode === 'sessionMeter'
  const hasLessonSegments = lessonFooterMode
  const hasAccountSegments = (lessonFooterAccountSegments?.length ?? 0) > 0
  const bottomSegments =
    lessonFooterMode || hasSessionMeter ? [] : splitFooterStaticSegments(bottomLine)
  const meterCurrent = hasSessionMeter ? Math.max(0, Math.floor(sessionMeter!.current)) : 0
  const meterTarget = hasSessionMeter ? Math.max(1, Math.floor(sessionMeter!.target)) : 1
  const meterXp = hasSessionMeter ? Math.max(0, Math.floor(sessionMeter!.sessionXp)) : 0
  const meterFill =
    hasSessionMeter && typeof sessionMeter!.fillPercent === 'number'
      ? Math.max(0, Math.min(100, Math.floor(sessionMeter!.fillPercent)))
      : Math.round((Math.min(meterCurrent, meterTarget) / meterTarget) * 100)
  const meterLabel = hasSessionMeter
    ? `⭐+${meterXp} XP · ${meterCurrent}/${meterTarget} · ${normalizeFooterText(sessionMeter!.statusLabel) || 'цель'}`
    : ''
  const bottomLineTitle = hasSessionMeter
    ? meterLabel
    : bottomSegments.length > 0
      ? bottomSegments.join(' · ')
      : bottomLine
  const showFooterContent =
    (isLessonActive || isDialogStarted || showWhenIdle) &&
    (topLine.length > 0 ||
      bottomLine.length > 0 ||
      hasLessonSegments ||
      hasSessionMeter ||
      Boolean(lessonFooterAccount))
  const showVariantProgress = Boolean(
    !hasSessionMeter && !lessonFooterMode && variantProgress && variantProgress.total > 1 && showFooterContent
  )
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
  const topRowAria =
    onFooterRowPress && showFooterContent
      ? footerRowAriaLabel?.trim() || 'Подсказка'
      : undefined
  const bottomRowAria =
    onFooterRowPress && showFooterContent
      ? footerRowAriaLabel?.trim() || 'Статистика'
      : undefined
  const showOpenGlyph = showLessonHudGlyph && showFooterContent && Boolean(onFooterRowPress)

  return (
    <div
      className={
        isDialogSessionColumn
          ? DIALOG_SESSION_FOOTER_GUTTER_CLASS
          : 'chat-shell-x app-footer-root pointer-events-none w-full shrink-0'
      }
      aria-hidden={!showFooterContent}
    >
      <div
        className={`app-footer-body mx-auto w-full min-w-0 ${DIALOG_SESSION_COLUMN_MAX_CLASS} ${
          lessonFooterMode ? 'px-1.5 sm:px-3' : 'px-2 sm:px-3'
        }`}
      >
        <div
          className={`${FOOTER_TOP_ROW_CLASS} ${showFooterContent ? '' : 'opacity-0'} ${footerRowPressClassName}`}
          suppressHydrationWarning
          role={onFooterRowPress && showFooterContent ? 'button' : undefined}
          tabIndex={onFooterRowPress && showFooterContent ? 0 : undefined}
          aria-label={topRowAria}
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
          {showOpenGlyph ? (
            <span className="app-footer-hud-glyph" aria-hidden>
              <svg
                className="app-footer-hud-glyph__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.25}
                  d="M6 14.5 12 8.5l6 6"
                />
              </svg>
            </span>
          ) : null}
        </div>
        <div
          className={`${FOOTER_BOTTOM_ROW_CLASS} ${showFooterContent ? '' : 'opacity-0'} ${footerRowPressClassName}`}
          suppressHydrationWarning
          role={onFooterRowPress && showFooterContent ? 'button' : undefined}
          tabIndex={onFooterRowPress && showFooterContent ? 0 : undefined}
          aria-label={bottomRowAria}
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
              ) : hasSessionMeter ? (
                <div
                  className="live-footer-stats-row flex min-w-0 flex-1 items-center gap-3 overflow-visible whitespace-nowrap tabular-nums sm:gap-4"
                  title={bottomLineTitle}
                >
                  <span className="inline-flex w-[5.5rem] shrink-0 items-center justify-start gap-1.5 overflow-visible sm:w-[6.5rem]">
                    <span className={FOOTER_STAT_GLYPH_CLASS} aria-hidden>
                      ⭐
                    </span>
                    <span className={`tabular-nums ${FOOTER_STAT_VALUE_CLASS}`}>+{meterXp} XP</span>
                  </span>
                  <span className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 text-[0.875rem] leading-none sm:text-base">
                    <span className="shrink-0 tabular-nums" aria-hidden>
                      0
                    </span>
                    <span
                      className="ui-progress-track relative top-px h-[0.65em] w-full max-w-[7.5rem] min-w-[2.5rem] overflow-hidden rounded-full bg-slate-200 sm:max-w-[9rem]"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={meterTarget}
                      aria-valuenow={Math.min(meterCurrent, meterTarget)}
                      aria-label={`Прогресс сессии ${meterCurrent} из ${meterTarget}`}
                    >
                      <span
                        className="ui-progress-fill ui-progress-fill--emerald block h-full rounded-full transition-[width] duration-300 ease-out"
                        style={{ width: `${meterFill}%` }}
                      />
                    </span>
                    <span className="shrink-0 tabular-nums" aria-hidden>
                      {meterTarget}
                    </span>
                  </span>
                  <span className="inline-flex w-[5.5rem] shrink-0 items-center justify-center overflow-visible sm:w-[6.5rem]">
                    <span
                      key={normalizeFooterText(sessionMeter!.statusLabel) || 'цель'}
                      className="session-meter-status-enter"
                    >
                      <EmojiLeadingStatText
                        text={normalizeFooterText(sessionMeter!.statusLabel) || 'цель'}
                        className={FOOTER_STAT_PAIR_CLASS}
                      />
                    </span>
                  </span>
                </div>
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
