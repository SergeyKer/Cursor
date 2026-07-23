'use client'

import {
  LANGUAGE_NOTE_CONTENT_INDENT_CLASS,
  LanguageNoteHighlightedPhrase,
  LanguageNoteSectionCard,
  LanguageNoteTopicChip,
} from '@/components/chat/LanguageNoteSheetPrimitives'
import type { CallReviewCard, CallReviewSession } from '@/lib/engvo/callReview/types'
import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import { CALL_REVIEW_COPY } from '@/lib/uiCopy/callReview'
import { manropeHome } from '@/lib/manropeHome'

const SUMMARY_LABEL_CLASS = `${manropeHome.className} text-[15px] font-bold uppercase tracking-[0.06em] text-[var(--language-note-card-label)]`
const ROW_LABEL_CLASS = `${manropeHome.className} text-[15px] font-bold uppercase tracking-[0.06em] text-[var(--language-note-card-label)]`
const ROW_TEXT_CLASS = `min-w-0 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} whitespace-pre-wrap break-words font-sans text-[15px] font-normal leading-[1.45] text-[var(--text)]`
const WHY_TEXT_CLASS = `min-w-0 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} whitespace-pre-wrap break-words font-sans text-[14px] font-normal leading-snug text-[var(--text)]`

function CallReviewErrorCard({ card }: { card: CallReviewCard }) {
  const correctTitle = card.teacherEtalon ? CALL_REVIEW_COPY.etalon : CALL_REVIEW_COPY.betterSo
  const reason = !card.teacherEtalon && card.reason?.trim() ? card.reason.trim() : null
  const better = !card.teacherEtalon && card.better?.trim() ? card.better.trim() : null

  return (
    <section
      role="note"
      className="chat-section-surface language-note-card language-note-card--shared relative block min-w-0 w-full max-w-full overflow-hidden rounded-xl border font-sans"
    >
      <div className="space-y-2">
        <div className="min-w-0 py-0.5">
          <p className={ROW_LABEL_CLASS}>
            <span aria-hidden>💬</span> {CALL_REVIEW_COPY.said}
          </p>
          <p className={`${ROW_TEXT_CLASS} mt-1`}>{card.original}</p>
        </div>

        <div className="min-w-0 border-t border-[var(--footer-sheet-divider)] pt-2">
          <p className={ROW_LABEL_CLASS}>
            <span aria-hidden>✅</span> {correctTitle}
          </p>
          <div className="mt-1">
            <LanguageNoteHighlightedPhrase text={card.correct} highlights={[]} />
          </div>
        </div>

        {reason ? (
          <div className="min-w-0 border-t border-[var(--footer-sheet-divider)] pt-2">
            <p className={ROW_LABEL_CLASS}>
              <span aria-hidden>💡</span> {CALL_REVIEW_COPY.why}
            </p>
            <p className={`${WHY_TEXT_CLASS} mt-1`}>{reason}</p>
          </div>
        ) : null}

        {better ? (
          <div className="min-w-0 border-t border-[var(--footer-sheet-divider)] pt-2">
            <p className={ROW_LABEL_CLASS}>
              <span aria-hidden>✨</span> {CALL_REVIEW_COPY.betterNatural}
            </p>
            <div className="mt-1">
              <LanguageNoteHighlightedPhrase text={better} highlights={[]} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function CallReviewSheetReady({
  session,
  onReviewTopicPress,
  reviewTopicsDisabled = false,
}: {
  session: CallReviewSession
  onReviewTopicPress?: (topic: LanguageNoteReviewTopic, note: LanguageNote) => void
  reviewTopicsDisabled?: boolean
}) {
  const chipInteractive = Boolean(onReviewTopicPress)

  return (
    <div className="space-y-4 font-sans">
      <p className={`${SUMMARY_LABEL_CLASS} px-0.5 text-[var(--language-note-card-label)]`}>
        {session.summaryLine}
      </p>

      {session.cards.map((card) => (
        <CallReviewErrorCard key={card.id} card={card} />
      ))}

      {session.topics.length > 0 ? (
        <LanguageNoteSectionCard tone="slate" marker="📖" title={CALL_REVIEW_COPY.review}>
          <div className={`${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} flex flex-col items-start gap-1`}>
            {session.topics.map(({ topic, representativeNote }) => (
              <LanguageNoteTopicChip
                key={topic.id}
                interactive={chipInteractive}
                disabled={reviewTopicsDisabled}
                onClick={
                  onReviewTopicPress
                    ? () => onReviewTopicPress(topic, representativeNote)
                    : undefined
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
