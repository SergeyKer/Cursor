'use client'

import React from 'react'
import ProgressCtaButton from '@/components/ProgressCtaButton'
import VocabularySpaceScroll from '@/components/vocabulary/VocabularySpaceScroll'
import VocabularyWordRow from '@/components/vocabulary/VocabularyWordRow'
import { vocabHubCopy } from '@/lib/uiCopy/vocabularyHub'
import type { Audience } from '@/lib/types'
import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

export type VocabListKind = 'world' | 'pack' | 'errors' | 'mastered' | 'bank' | 'study' | 'vitrine'

type Props = {
  title: string
  audience: Audience
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  showMarks: boolean
  stickyLabel?: string | null
  onBack: () => void
  onStudy: (word: NecessaryWord) => void
  onKnow: (word: NecessaryWord) => void
  onSticky?: () => void
  allowSearch?: boolean
}

export default function VocabularyListScreen({
  title,
  audience,
  words,
  progressMap,
  showMarks,
  stickyLabel,
  onBack,
  onStudy,
  onKnow,
  onSticky,
  allowSearch = false,
}: Props) {
  const copy = vocabHubCopy(audience)
  const [query, setQuery] = React.useState('')
  const [shown, setShown] = React.useState(20)
  const filtered = words.filter((word) => {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return word.en.toLowerCase().includes(q) || word.ru.toLowerCase().includes(q)
  })
  const visible = filtered.slice(0, shown)

  return (
    <VocabularySpaceScroll
      footer={
        stickyLabel && onSticky ? (
          <div className="mx-auto w-full max-w-[29rem] shrink-0 px-3 pb-[calc(var(--app-footer-chrome-height)+0.75rem)]">
            <ProgressCtaButton onClick={onSticky}>{stickyLabel}</ProgressCtaButton>
          </div>
        ) : null
      }
    >
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[17px] font-semibold text-[var(--text)]">{title}</p>
          <button type="button" onClick={onBack} className="text-[14px] font-semibold text-[var(--text)]">
            {copy.back}
          </button>
        </div>
        {allowSearch ? (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск…"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
          />
        ) : null}
        <div className="space-y-2 pb-24">
          {visible.map((word) => {
            const progress = progressMap[String(word.id)]
            return (
              <VocabularyWordRow
                key={word.id}
                word={word}
                showMarks={showMarks}
                studyActive={progress?.userMark === 'study'}
                knowActive={progress?.userMark === 'know'}
                onStudy={() => onStudy(word)}
                onKnow={() => onKnow(word)}
              />
            )
          })}
          {filtered.length > shown ? (
            <button
              type="button"
              className="w-full py-2 text-[14px] text-[var(--text-muted)]"
              onClick={() => setShown((n) => n + 20)}
            >
              {copy.more}
            </button>
          ) : null}
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--chat-shell-bg)] px-3 py-4 text-[14px] text-[var(--text-muted)]">
              Пока пусто.
            </p>
          ) : null}
        </div>
    </VocabularySpaceScroll>
  )
}
