'use client'

import type { ReactNode } from 'react'
import { highlightCorrected } from '@/lib/languageNote/highlightCorrected'
import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import { manropeHome } from '@/lib/manropeHome'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

type SectionTone = 'neutral' | 'amber' | 'emerald' | 'praise' | 'slate'

function toneClasses(tone: SectionTone): { surface: string; label: string } {
  if (tone === 'amber') {
    return {
      surface:
        'border-[var(--chat-section-amber-border)] bg-[var(--chat-section-amber)]',
      label: 'text-[var(--status-warning-text)]',
    }
  }
  // Shared calm Engvo-blue surface for all content cards.
  if (tone === 'emerald' || tone === 'praise' || tone === 'slate') {
    return {
      surface: 'language-note-card--shared',
      label: 'text-[var(--language-note-card-label)]',
    }
  }
  return {
    surface:
      'border-[var(--chat-section-neutral-border)] bg-[var(--chat-section-neutral)]',
    label: 'text-[var(--chat-label-neutral)]',
  }
}

/** Same family as HomeEmptyBubble «Интересный факт» — stronger for sheet card titles. */
const NOTE_LABEL_CLASS = `${manropeHome.className} text-[15px] font-bold uppercase tracking-[0.06em]`

const TOPIC_CHIP_BASE_CLASS =
  'language-note-topic-chip inline-flex w-fit max-w-full min-h-10 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-left font-sans text-[13px] font-normal leading-snug text-[var(--text)] touch-manipulation transition-[background-color,border-color,transform,opacity] duration-150'

function TopicChip({
  children,
  onClick,
  disabled,
  interactive,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  interactive?: boolean
}) {
  if (!interactive || !onClick) {
    return <div className={`${TOPIC_CHIP_BASE_CLASS}`}>{children}</div>
  }
  return (
    <button
      type="button"
      className={`${TOPIC_CHIP_BASE_CLASS} language-note-topic-chip--button cursor-pointer hover:brightness-[0.98] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:cursor-default disabled:opacity-55 disabled:active:scale-100`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
        ›
      </span>
    </button>
  )
}

function NoteSectionCard({
  tone,
  marker,
  title,
  children,
}: {
  tone: SectionTone
  marker: string
  title: string
  children: ReactNode
}) {
  const { surface, label } = toneClasses(tone)
  return (
    <section
      className={`chat-section-surface language-note-card relative block min-w-0 w-full max-w-full overflow-hidden rounded-xl border font-sans ${surface}`}
      role="note"
    >
      <p className={`${NOTE_LABEL_CLASS} ${label}`}>
        <span aria-hidden>{marker}</span> {title}
      </p>
      <div className="language-note-card__body min-w-0 font-sans text-[15px] leading-[1.45] text-[var(--text)]">
        {children}
      </div>
    </section>
  )
}

/** Shared content column — same left edge as reason text (after bullet). */
const CONTENT_INDENT_CLASS = 'language-note-content'

function HighlightedPhrase({ text, highlights }: { text: string; highlights: string[] }) {
  const segments = highlightCorrected(text, highlights)
  return (
    <p
      className={`min-w-0 ${CONTENT_INDENT_CLASS} whitespace-pre-wrap break-words font-sans text-[15px] font-normal leading-[1.45] text-[var(--text)]`}
    >
      {segments.map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="font-bold">
            {seg.text}
          </strong>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  )
}

function ReasonsList({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null
  return (
    <div className="language-note-reasons">
      <ul className="language-note-reasons__list font-sans text-[14px] font-normal leading-snug">
        {reasons.map((reason, i) => (
          <li key={`${i}-${reason.slice(0, 24)}`} className="min-w-0 break-words">
            {reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

function OriginalMessageCard({ text }: { text: string }) {
  const trimmed = text.trim()
  if (!trimmed) return null
  return (
    <NoteSectionCard tone="emerald" marker="💬" title={LANGUAGE_NOTE_COPY.original}>
      <p
        className={`min-w-0 ${CONTENT_INDENT_CLASS} whitespace-pre-wrap break-words font-sans text-[15px] font-normal leading-[1.45] text-[var(--text)]`}
      >
        {trimmed}
      </p>
    </NoteSectionCard>
  )
}

function SkeletonCard() {
  return (
    <div
      className="chat-section-surface language-note-card language-note-card--shared relative overflow-hidden rounded-xl border"
      aria-hidden
    >
      <span className="typing-indicator-shimmer language-note-skeleton-shimmer" />
      <div className="language-note-skeleton-bar language-note-skeleton-bar--label" />
      <div className="language-note-card__body">
        <div className={`language-note-skeleton-bar language-note-skeleton-bar--w92 ${CONTENT_INDENT_CLASS}`} />
        <div className={`language-note-skeleton-bar language-note-skeleton-bar--w70 ${CONTENT_INDENT_CLASS}`} />
        <div className={`language-note-skeleton-bar language-note-skeleton-bar--w55 ${CONTENT_INDENT_CLASS}`} />
      </div>
    </div>
  )
}

export function LanguageNoteSheetLoading() {
  return (
    <div className="space-y-3 font-sans" aria-busy="true">
      <span className="sr-only">{LANGUAGE_NOTE_COPY.loadingSr}</span>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}

export function LanguageNoteSheetError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="space-y-3 font-sans">
      <NoteSectionCard tone="amber" marker="⚠️" title={LANGUAGE_NOTE_COPY.error}>
        <p className={`${CONTENT_INDENT_CLASS} font-sans text-[15px] font-normal leading-[1.45] text-[var(--text)]`}>
          {message}
        </p>
        <button
          type="button"
          className={`mt-1 ${CONTENT_INDENT_CLASS} rounded-lg border border-[var(--chat-section-amber-border)] bg-[var(--chat-assistant-shell)] px-3 py-1.5 font-sans text-sm font-medium text-[var(--text)] touch-manipulation`}
          onClick={onRetry}
        >
          {LANGUAGE_NOTE_COPY.retry}
        </button>
      </NoteSectionCard>
    </div>
  )
}

export function LanguageNoteSheetReady({
  note,
  onReviewTopicPress,
  reviewTopicsDisabled = false,
}: {
  note: LanguageNote
  onReviewTopicPress?: (topic: LanguageNoteReviewTopic, note: LanguageNote) => void
  reviewTopicsDisabled?: boolean
}) {
  const chipInteractive = Boolean(onReviewTopicPress)

  if (note.status === 'already_good') {
    return (
      <div className="space-y-3 font-sans">
        <OriginalMessageCard text={note.original} />
        <NoteSectionCard tone="praise" marker="✅" title={LANGUAGE_NOTE_COPY.alreadyGood}>
          <HighlightedPhrase text={note.correct} highlights={note.correctHighlights} />
          <ReasonsList reasons={note.correctReasons.slice(0, 1)} />
        </NoteSectionCard>
        {note.reviewTopics.length > 0 ? (
          <NoteSectionCard tone="slate" marker="📖" title={LANGUAGE_NOTE_COPY.review}>
            <div className={`${CONTENT_INDENT_CLASS} flex flex-col items-start gap-1`}>
              {note.reviewTopics.slice(0, 1).map((topic) => (
                <TopicChip
                  key={topic.id}
                  interactive={chipInteractive}
                  disabled={reviewTopicsDisabled}
                  onClick={
                    onReviewTopicPress ? () => onReviewTopicPress(topic, note) : undefined
                  }
                >
                  {topic.title}
                </TopicChip>
              ))}
            </div>
          </NoteSectionCard>
        ) : null}
      </div>
    )
  }

  const primaryBetter =
    note.better && !phrasesEqualLoose(note.better, note.correct) ? note.better : null
  const shortAlternatives = note.betterAlternatives
    .filter((alt) => !phrasesEqualLoose(alt, note.correct))
    .filter((alt) => !(primaryBetter && phrasesEqualLoose(alt, primaryBetter)))
    .slice(0, 1)
  const showBetter = Boolean(primaryBetter) || shortAlternatives.length > 0
  const showReview = note.reviewTopics.length > 0

  return (
    <div className="space-y-3 font-sans">
      <OriginalMessageCard text={note.original} />
      <NoteSectionCard
        tone="emerald"
        marker="✅"
        title={note.teacherEtalon ? LANGUAGE_NOTE_COPY.etalon : LANGUAGE_NOTE_COPY.correct}
      >
        <HighlightedPhrase text={note.correct} highlights={note.correctHighlights} />
        <ReasonsList reasons={note.correctReasons} />
      </NoteSectionCard>

      {showBetter ? (
        <NoteSectionCard tone="praise" marker="✨" title={LANGUAGE_NOTE_COPY.better}>
          {primaryBetter ? (
            <>
              <HighlightedPhrase text={primaryBetter} highlights={note.betterHighlights} />
              <ReasonsList reasons={note.betterReasons.slice(0, 1)} />
            </>
          ) : null}
          {shortAlternatives.map((alt) => (
            <p
              key={alt}
              className={`min-w-0 ${CONTENT_INDENT_CLASS} break-words font-sans text-[14px] font-normal leading-snug text-[var(--text)]`}
            >
              <span className="text-[var(--language-note-card-label)]">
                {LANGUAGE_NOTE_COPY.betterOr}
              </span>{' '}
              {alt}
            </p>
          ))}
        </NoteSectionCard>
      ) : null}

      {showReview ? (
        <NoteSectionCard tone="slate" marker="📖" title={LANGUAGE_NOTE_COPY.review}>
          <div className={`${CONTENT_INDENT_CLASS} flex flex-col items-start gap-1`}>
            {note.reviewTopics.map((topic) => (
              <TopicChip
                key={topic.id}
                interactive={chipInteractive}
                disabled={reviewTopicsDisabled}
                onClick={onReviewTopicPress ? () => onReviewTopicPress(topic, note) : undefined}
              >
                {topic.title}
              </TopicChip>
            ))}
          </div>
        </NoteSectionCard>
      ) : null}
    </div>
  )
}

function phrasesEqualLoose(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  return norm(a) === norm(b)
}
