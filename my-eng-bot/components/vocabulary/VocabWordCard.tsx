'use client'

import { playVocabTts, stopVocabTts } from '@/lib/vocabulary/playVocabTts'
import { VOCAB_CARD_SURFACE, VOCAB_LEMMA_RU, VOCAB_PAIR_EN, VOCAB_PAIR_LINE } from '@/lib/vocabulary/cardStyles'
import type { NecessaryWord } from '@/types/vocabulary'

type Props = {
  word: NecessaryWord
  showMarks?: boolean
  showKnow?: boolean
  studyActive?: boolean
  knowActive?: boolean
  studyLabel?: string
  knowLabel?: string
  listenLabel?: string
  onStudy?: () => void
  onKnow?: () => void
}

export default function VocabWordCard({
  word,
  showMarks = false,
  showKnow = true,
  studyActive = false,
  knowActive = false,
  studyLabel = 'Учить',
  knowLabel = 'Знакомо',
  listenLabel = 'Слушать',
  onStudy,
  onKnow,
}: Props) {
  return (
    <article className={`${VOCAB_CARD_SURFACE} px-3 py-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={VOCAB_PAIR_LINE}>
            <span className={VOCAB_PAIR_EN}>{word.en}</span>
          </p>
          <p className={`mt-0.5 ${VOCAB_LEMMA_RU}`}>{word.ru}</p>
        </div>
        <button
          type="button"
          aria-label={listenLabel}
          className="shrink-0 rounded-lg px-2 py-1 text-[16px] text-[var(--text-muted)]"
          onClick={() => {
            stopVocabTts()
            void playVocabTts(word.en)
          }}
        >
          ♪
        </button>
      </div>
      {showMarks ? (
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onStudy}
            className={`text-[13px] font-semibold ${studyActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
          >
            {studyLabel}
          </button>
          {showKnow ? (
            <button
              type="button"
              onClick={onKnow}
              className={`text-[13px] font-semibold ${knowActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
            >
              {knowLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
