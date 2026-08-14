'use client'

import React from 'react'
import VocabWordCard from '@/components/vocabulary/VocabWordCard'
import { vocabHubCopy } from '@/lib/uiCopy/vocabularyHub'
import type { Audience } from '@/lib/types'
import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

type Props = {
  title: string
  audience: Audience
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  showMarks: boolean
  onStudy: (word: NecessaryWord) => void
  onKnow: (word: NecessaryWord) => void
  allowSearch?: boolean
  emptyText?: string
  extra?: React.ReactNode
}

export default function VocabularyListScreen({
  title,
  audience,
  words,
  progressMap,
  showMarks,
  onStudy,
  onKnow,
  allowSearch = false,
  emptyText,
  extra,
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
    <div className="space-y-2.5">
      <p className="text-[17px] font-semibold text-[var(--text)]">{title}</p>
      {allowSearch ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
        />
      ) : null}
      {extra}
      <div className="space-y-2">
        {visible.map((word) => {
          const progress = progressMap[String(word.id)]
          return (
            <VocabWordCard
              key={word.id}
              word={word}
              showMarks={showMarks}
              showKnow={showMarks}
              studyActive={progress?.userMark === 'study'}
              knowActive={progress?.userMark === 'know'}
              studyLabel={copy.study}
              knowLabel={copy.know}
              listenLabel={copy.listen}
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
          <p className="rounded-xl border border-[var(--border)] bg-white px-3 py-4 text-[14px] text-[var(--text-muted)]">
            {query.trim() ? copy.emptyList : emptyText ?? copy.emptyList}
          </p>
        ) : null}
      </div>
    </div>
  )
}
