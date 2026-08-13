'use client'

import { playVocabTts, stopVocabTts } from '@/lib/vocabulary/playVocabTts'
import type { NecessaryWord } from '@/types/vocabulary'

type Props = {
  word: NecessaryWord
  showMarks?: boolean
  studyActive?: boolean
  knowActive?: boolean
  onStudy?: () => void
  onKnow?: () => void
}

export default function VocabularyWordRow({
  word,
  showMarks = false,
  studyActive = false,
  knowActive = false,
  onStudy,
  onKnow,
}: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--chat-shell-bg)] px-3 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-[var(--text)]">{word.en}</p>
          <p className="text-[14px] text-[var(--text-muted)]">{word.ru}</p>
        </div>
        <button
          type="button"
          aria-label="Слушать"
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
            Учить
          </button>
          <button
            type="button"
            onClick={onKnow}
            className={`text-[13px] font-semibold ${knowActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
          >
            Знаю
          </button>
        </div>
      ) : null}
    </div>
  )
}
