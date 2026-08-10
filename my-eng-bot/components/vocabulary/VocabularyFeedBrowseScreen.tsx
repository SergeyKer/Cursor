'use client'

import React from 'react'
import { listByFeedStatus, lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import { writeVocabTranslationHandoff } from '@/lib/vocabulary/translationHandoff'
import { loadVocabMistakes, vocabMistakeLemmaKeys } from '@/lib/vocabulary/mistakesList'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
} from '@/lib/vocabulary/storage'
import type {
  NecessaryWord,
  NecessaryWordsCatalog,
  VocabularyFeedStatus,
  VocabularyFooterView,
  VocabularyProgressState,
} from '@/types/vocabulary'

type Tab = 'queue' | 'in_feed' | 'mastered' | 'mistakes'

type Props = {
  onBack: () => void
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onOpenTranslationWithHandoff?: () => void
  onOpenCallWithHandoff?: () => void
}

export default function VocabularyFeedBrowseScreen({
  onBack,
  onFooterViewChange,
  onOpenTranslationWithHandoff,
  onOpenCallWithHandoff,
}: Props) {
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [tab, setTab] = React.useState<Tab>('in_feed')
  const [query, setQuery] = React.useState('')

  React.useEffect(() => {
    setProgress(loadVocabularyProgress())
  }, [])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const response = await fetch('/data/vocabulary/necessary-words.json')
        const raw = (await response.json()) as NecessaryWordsCatalog
        if (!alive || !response.ok) return
        setCatalog(raw)
        void import('@/lib/vocabulary/catalogCache').then((mod) => {
          const words = (raw.words ?? []).filter((w) => w.status === 'active')
          mod.setCachedNecessaryWords(words)
        })
      } catch {
        // ignore
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    onFooterViewChange?.({
      dynamicText: 'Банк и статусы слов.',
      staticText: 'Слова в деле',
      typingKey: `vocab-feed-${tab}`,
    })
    return () => onFooterViewChange?.(null)
  }, [onFooterViewChange, tab])

  const activeWords = React.useMemo(
    () => (catalog?.words ?? []).filter((w) => w.status === 'active'),
    [catalog]
  )

  const list = React.useMemo(() => {
    let words: NecessaryWord[]
    if (tab === 'mistakes') {
      const keys = vocabMistakeLemmaKeys()
      words = activeWords.filter((w) => keys.has(lemmaKeyFromEn(w.en)))
    } else {
      const status: VocabularyFeedStatus | 'queue' =
        tab === 'queue' ? 'queue' : tab === 'in_feed' ? 'in_feed' : 'mastered'
      words = listByFeedStatus(activeWords, progress.words, status)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      words = words.filter((w) => w.en.toLowerCase().includes(q) || w.ru.toLowerCase().includes(q))
    }
    return words
  }, [activeWords, progress.words, query, tab])

  const handoffFeed = () => {
    const bank = listByFeedStatus(activeWords, progress.words, 'in_feed').slice(0, 3)
    if (bank.length === 0) return
    writeVocabTranslationHandoff({
      lemmas: bank.map((w) => ({
        en: w.en,
        ru: w.ru,
        wordId: w.id,
        lemmaKey: lemmaKeyFromEn(w.en),
      })),
      source: 'feed_browse',
      loadStudying: true,
    })
    onOpenTranslationWithHandoff?.()
  }

  const handoffMistakes = (open: 'translation' | 'call') => {
    const keys = vocabMistakeLemmaKeys()
    const fromCatalog = activeWords.filter((w) => keys.has(lemmaKeyFromEn(w.en))).slice(0, 3)
    const lemmas =
      fromCatalog.length > 0
        ? fromCatalog.map((w) => ({
            en: w.en,
            ru: w.ru,
            wordId: w.id,
            lemmaKey: lemmaKeyFromEn(w.en),
          }))
        : loadVocabMistakes()
            .slice(0, 3)
            .map((m) => ({
              en: m.en,
              ru: m.ru ?? '',
              lemmaKey: m.lemmaKey,
            }))
    if (lemmas.length === 0) return
    writeVocabTranslationHandoff({
      lemmas,
      source: 'feed_browse',
      loadStudying: true,
    })
    if (open === 'call') {
      onOpenCallWithHandoff?.()
    } else {
      onOpenTranslationWithHandoff?.()
    }
  }

  const mistakesCtaDisabled = list.length === 0 && loadVocabMistakes().length === 0

  const tabLabel = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`btn-3d-menu flex-1 rounded-lg border px-2 py-2 text-[12px] font-semibold ${
        tab === id
          ? 'border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] text-[var(--text)]'
          : 'border-[var(--border)] bg-[var(--menu-control-bg)] text-[var(--text-muted)]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x mx-auto flex min-h-0 w-full max-w-[29rem] flex-1 flex-col gap-3 overflow-y-auto py-3">
        <div className="flex items-center justify-between gap-2 rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-3 shadow-sm">
          <div>
            <p className="text-[17px] font-semibold text-[var(--text)]">Слова в деле</p>
            <p className="text-[13px] text-[var(--text-muted)]">К изучению · В деле · Умею · Из ошибок</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="btn-3d-menu rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--text)]"
          >
            Назад
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabLabel('queue', 'К изучению')}
          {tabLabel('in_feed', 'В деле')}
          {tabLabel('mastered', 'Умею')}
          {tabLabel('mistakes', 'Из ошибок')}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск…"
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
        />

        {tab === 'in_feed' ? (
          <button
            type="button"
            onClick={handoffFeed}
            disabled={list.length === 0}
            className="btn-3d-menu rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] font-semibold text-[var(--text)] disabled:opacity-50"
          >
            Закрепить в переводе
          </button>
        ) : null}

        {tab === 'mistakes' ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handoffMistakes('translation')}
              disabled={mistakesCtaDisabled}
              className="btn-3d-menu rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[14px] font-semibold text-[var(--text)] disabled:opacity-50"
            >
              Закрепить в переводе
            </button>
            {onOpenCallWithHandoff ? (
              <button
                type="button"
                onClick={() => handoffMistakes('call')}
                disabled={mistakesCtaDisabled}
                className="btn-3d-menu rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-[14px] font-semibold text-[var(--text)] disabled:opacity-50"
              >
                В звонок
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 pb-4">
          {list.length === 0 ? (
            <div className="rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-5 text-[14px] text-[var(--text-muted)] shadow-sm">
              Пока пусто.
            </div>
          ) : (
            list.map((word: NecessaryWord) => (
              <div
                key={word.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--chat-shell-bg)] px-3 py-3 shadow-sm"
              >
                <p className="text-[16px] font-bold text-[var(--text)]">{word.en}</p>
                <p className="text-[14px] text-[var(--text-muted)]">{word.ru}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
