'use client'

import {
  LANGUAGE_NOTE_CONTENT_INDENT_CLASS,
  LanguageNoteHighlightedPhrase,
  LanguageNoteOriginalMessageCard,
  LanguageNoteReasonsList,
  LanguageNoteSectionCard,
  LanguageNoteTopicChip,
  phrasesEqualLoose,
} from '@/components/chat/LanguageNoteSheetPrimitives'
import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

function SkeletonCard() {
  return (
    <div
      className="chat-section-surface language-note-card language-note-card--shared relative overflow-hidden rounded-xl border"
      aria-hidden
    >
      <span className="typing-indicator-shimmer language-note-skeleton-shimmer" />
      <div className="language-note-skeleton-bar language-note-skeleton-bar--label" />
      <div className="language-note-card__body">
        <div
          className={`language-note-skeleton-bar language-note-skeleton-bar--w92 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS}`}
        />
        <div
          className={`language-note-skeleton-bar language-note-skeleton-bar--w70 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS}`}
        />
        <div
          className={`language-note-skeleton-bar language-note-skeleton-bar--w55 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS}`}
        />
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
      <LanguageNoteSectionCard tone="amber" marker="⚠️" title={LANGUAGE_NOTE_COPY.error}>
        <p
          className={`${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} font-sans text-[15px] font-normal leading-[1.45] text-[var(--text)]`}
        >
          {message}
        </p>
        <button
          type="button"
          className={`mt-1 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} rounded-lg border border-[var(--chat-section-amber-border)] bg-[var(--chat-assistant-shell)] px-3 py-1.5 font-sans text-sm font-medium text-[var(--text)] touch-manipulation`}
          onClick={onRetry}
        >
          {LANGUAGE_NOTE_COPY.retry}
        </button>
      </LanguageNoteSectionCard>
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
        <LanguageNoteOriginalMessageCard text={note.original} />
        <LanguageNoteSectionCard tone="praise" marker="✅" title={LANGUAGE_NOTE_COPY.alreadyGood}>
          <LanguageNoteHighlightedPhrase text={note.correct} highlights={note.correctHighlights} />
          <LanguageNoteReasonsList reasons={note.correctReasons.slice(0, 1)} />
        </LanguageNoteSectionCard>
        {note.reviewTopics.length > 0 ? (
          <LanguageNoteSectionCard tone="slate" marker="📖" title={LANGUAGE_NOTE_COPY.review}>
            <div className={`${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} flex flex-col items-start gap-1`}>
              {note.reviewTopics.slice(0, 1).map((topic) => (
                <LanguageNoteTopicChip
                  key={topic.id}
                  interactive={chipInteractive}
                  disabled={reviewTopicsDisabled}
                  onClick={
                    onReviewTopicPress ? () => onReviewTopicPress(topic, note) : undefined
                  }
                >
                  {topic.title}
                </LanguageNoteTopicChip>
              ))}
            </div>
          </LanguageNoteSectionCard>
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
      <LanguageNoteOriginalMessageCard text={note.original} />
      <LanguageNoteSectionCard
        tone="emerald"
        marker="✅"
        title={note.teacherEtalon ? LANGUAGE_NOTE_COPY.etalon : LANGUAGE_NOTE_COPY.correct}
      >
        <LanguageNoteHighlightedPhrase text={note.correct} highlights={note.correctHighlights} />
        <LanguageNoteReasonsList reasons={note.correctReasons} />
      </LanguageNoteSectionCard>

      {showBetter ? (
        <LanguageNoteSectionCard tone="praise" marker="✨" title={LANGUAGE_NOTE_COPY.better}>
          {primaryBetter ? (
            <>
              <LanguageNoteHighlightedPhrase
                text={primaryBetter}
                highlights={note.betterHighlights}
              />
              <LanguageNoteReasonsList reasons={note.betterReasons.slice(0, 1)} />
            </>
          ) : null}
          {shortAlternatives.map((alt) => (
            <p
              key={alt}
              className={`min-w-0 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} break-words font-sans text-[14px] font-normal leading-snug text-[var(--text)]`}
            >
              <span className="text-[var(--language-note-card-label)]">
                {LANGUAGE_NOTE_COPY.betterOr}
              </span>{' '}
              {alt}
            </p>
          ))}
        </LanguageNoteSectionCard>
      ) : null}

      {showReview ? (
        <LanguageNoteSectionCard tone="slate" marker="📖" title={LANGUAGE_NOTE_COPY.review}>
          <div className={`${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} flex flex-col items-start gap-1`}>
            {note.reviewTopics.map((topic) => (
              <LanguageNoteTopicChip
                key={topic.id}
                interactive={chipInteractive}
                disabled={reviewTopicsDisabled}
                onClick={onReviewTopicPress ? () => onReviewTopicPress(topic, note) : undefined}
              >
                {topic.title}
              </LanguageNoteTopicChip>
            ))}
          </div>
        </LanguageNoteSectionCard>
      ) : null}
    </div>
  )
}
