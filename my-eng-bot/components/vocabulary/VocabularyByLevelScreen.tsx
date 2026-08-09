'use client'

import React from 'react'
import VocabularyTempoToggle from '@/components/vocabulary/VocabularyTempoToggle'
import VocabularyThinSession from '@/components/vocabulary/VocabularyThinSession'
import { useVocabularyTempo } from '@/hooks/useVocabularyTempo'
import { isWordInProgress, listStrictlyLearnedWords } from '@/lib/vocabulary/learned'
import { VOCABULARY_LEVELS } from '@/lib/vocabulary/levels'
import { pickNextSessionWords } from '@/lib/vocabulary/srs'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { VOCABULARY_TOPICS } from '@/lib/vocabulary/topics'
import type {
  NecessaryWord,
  NecessaryWordsCatalog,
  VocabularyFooterView,
  VocabularyLevelId,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyTempo,
  VocabularyTopicId,
} from '@/types/vocabulary'

type HubTab = 'levels' | 'learned'

type ThinSessionLaunch = {
  words: NecessaryWord[]
  route: VocabularySessionRoute
  tempo: VocabularyTempo
  routeTitle: string
  distractorPool: NecessaryWord[]
}

type VocabularyByLevelScreenProps = {
  onBackToLessons: () => void
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onOpenTranslationWithHandoff?: () => void
}

function normalizeCatalogPayload(data: NecessaryWordsCatalog): NecessaryWordsCatalog {
  const levels = data.levels?.length ? data.levels : VOCABULARY_LEVELS
  const topics = data.topics?.length ? data.topics : VOCABULARY_TOPICS
  const words = data.words.map((word) => ({
    ...word,
    primaryLevel: word.primaryLevel ?? 'a2',
    primaryVocabularyTopic: word.primaryVocabularyTopic ?? 'core',
  }))
  return { ...data, levels, topics, words }
}

function getLevelPrefix(levelId: VocabularyLevelId, catalog: NecessaryWordsCatalog | null): string {
  const list = catalog?.levels?.length ? catalog.levels : VOCABULARY_LEVELS
  return list.find((level) => level.id === levelId)?.prefixLabel ?? levelId.toUpperCase()
}

function getTopicTitle(topicId: VocabularyTopicId, catalog: NecessaryWordsCatalog | null): string {
  const list = catalog?.topics?.length ? catalog.topics : VOCABULARY_TOPICS
  return list.find((topic) => topic.id === topicId)?.title ?? topicId
}

function wordsForLevelTopic(words: NecessaryWord[], levelId: VocabularyLevelId, topicId: VocabularyTopicId): NecessaryWord[] {
  return words.filter((word) => word.primaryLevel === levelId && word.primaryVocabularyTopic === topicId)
}

function wordsForLevel(words: NecessaryWord[], levelId: VocabularyLevelId): NecessaryWord[] {
  return words.filter((word) => word.primaryLevel === levelId)
}

function countWordsInProgress(state: VocabularyProgressState, words: NecessaryWord[]): number {
  return words.filter((word) => isWordInProgress(state.words[String(word.id)])).length
}

export default function VocabularyByLevelScreen({
  onBackToLessons,
  onFooterViewChange,
  onOpenTranslationWithHandoff,
}: VocabularyByLevelScreenProps) {
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [session, setSession] = React.useState<ThinSessionLaunch | null>(null)
  const [sessionKey, setSessionKey] = React.useState(0)
  const [hubTab, setHubTab] = React.useState<HubTab>('levels')
  const [browseLevelId, setBrowseLevelId] = React.useState<VocabularyLevelId | null>(null)
  const [learnedFilter, setLearnedFilter] = React.useState('')
  const { tempo, setTempo, size: tempoSize } = useVocabularyTempo()
  const lastLaunchRef = React.useRef<{
    levelId: VocabularyLevelId
    topicId: VocabularyTopicId
  } | null>(null)

  React.useEffect(() => {
    setProgress(loadVocabularyProgress())
  }, [])

  React.useEffect(() => {
    let active = true
    async function loadCatalog() {
      try {
        setLoading(true)
        setLoadError(null)
        const response = await fetch('/data/vocabulary/necessary-words.json')
        const raw = (await response.json()) as NecessaryWordsCatalog
        if (!response.ok) throw new Error('Не удалось загрузить словарь.')
        if (!active) return
        setCatalog(normalizeCatalogPayload(raw))
      } catch (error) {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить словарь.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadCatalog()
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    return () => {
      onFooterViewChange?.(null)
    }
  }, [onFooterViewChange])

  const activeWords = React.useMemo(
    () => (catalog?.words ?? []).filter((word) => word.status === 'active'),
    [catalog]
  )

  const levelList = catalog?.levels?.length ? catalog.levels : VOCABULARY_LEVELS
  const topicList = catalog?.topics?.length ? catalog.topics : VOCABULARY_TOPICS

  React.useEffect(() => {
    if (session) return

    if (hubTab === 'learned') {
      onFooterViewChange?.({
        dynamicText: 'Слова с закреплением по SRS.',
        staticText: 'Слова по уровням | Выученные',
        typingKey: 'vocab-level-learned-footer',
      })
      return
    }

    if (browseLevelId) {
      onFooterViewChange?.({
        dynamicText: 'Выбери тему и начни короткую сессию.',
        staticText: `Слова по уровням | ${getLevelPrefix(browseLevelId, catalog)}`,
        typingKey: `vocab-level-topics-${browseLevelId}`,
      })
      return
    }

    onFooterViewChange?.({
      dynamicText: 'Выбери уровень CEFR или тему.',
      staticText: 'Слова по уровням | Уровни',
      typingKey: 'vocab-level-hub-footer',
    })
  }, [onFooterViewChange, session, hubTab, browseLevelId, catalog])

  const buildLaunch = React.useCallback(
    (levelId: VocabularyLevelId, topicId: VocabularyTopicId): ThinSessionLaunch | null => {
      const pool = wordsForLevelTopic(activeWords, levelId, topicId)
      const plannedWords = pickNextSessionWords({
        words: pool,
        progressMap: progress.words,
        size: tempoSize,
      })
      if (plannedWords.length === 0) return null
      return {
        words: plannedWords,
        route: { kind: 'level', levelId, topicId },
        tempo,
        routeTitle: `${getLevelPrefix(levelId, catalog)} · ${getTopicTitle(topicId, catalog)}`,
        distractorPool: pool,
      }
    },
    [activeWords, catalog, progress.words, tempo, tempoSize]
  )

  const startTopicSession = React.useCallback(
    (levelId: VocabularyLevelId, topicId: VocabularyTopicId) => {
      const next = buildLaunch(levelId, topicId)
      if (!next) return
      lastLaunchRef.current = { levelId, topicId }
      setSession(next)
      setSessionKey((key) => key + 1)
    },
    [buildLaunch]
  )

  const handleAgain = React.useCallback(() => {
    const last = lastLaunchRef.current
    if (!last) {
      setSession(null)
      return
    }
    // Reload progress first so pickNext sees banked words from the finished session.
    const latest = loadVocabularyProgress()
    setProgress(latest)
    const pool = wordsForLevelTopic(activeWords, last.levelId, last.topicId)
    const plannedWords = pickNextSessionWords({
      words: pool,
      progressMap: latest.words,
      size: tempoSize,
    })
    if (plannedWords.length === 0) {
      setSession(null)
      return
    }
    setSession({
      words: plannedWords,
      route: { kind: 'level', levelId: last.levelId, topicId: last.topicId },
      tempo,
      routeTitle: `${getLevelPrefix(last.levelId, catalog)} · ${getTopicTitle(last.topicId, catalog)}`,
      distractorPool: pool,
    })
    setSessionKey((key) => key + 1)
  }, [activeWords, catalog, tempo, tempoSize])

  const strictlyLearnedEntries = React.useMemo(
    () => listStrictlyLearnedWords(activeWords, progress.words),
    [activeWords, progress.words]
  )

  const filteredLearned = React.useMemo(() => {
    const query = learnedFilter.trim().toLowerCase()
    if (!query) return strictlyLearnedEntries
    return strictlyLearnedEntries.filter(
      (entry) =>
        entry.word.en.toLowerCase().includes(query) ||
        entry.word.ru.toLowerCase().includes(query)
    )
  }, [strictlyLearnedEntries, learnedFilter])

  const hubBody = (
    <>
      <div className="flex gap-2 rounded-[1rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] p-1 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setHubTab('levels')
            setBrowseLevelId(null)
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ${
            hubTab === 'levels' ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'
          }`}
        >
          Уровни
        </button>
        <button
          type="button"
          onClick={() => {
            setHubTab('learned')
            setBrowseLevelId(null)
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ${
            hubTab === 'learned' ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'
          }`}
        >
          Выученные
        </button>
      </div>

      {hubTab === 'levels' && !browseLevelId && (
        <div className="space-y-2">
          {levelList.map((level) => {
            const pool = wordsForLevel(activeWords, level.id)
            const reviewed = countWordsInProgress(progress, pool)
            const empty = pool.length === 0
            return (
              <button
                key={level.id}
                type="button"
                disabled={empty}
                onClick={() => !empty && setBrowseLevelId(level.id)}
                className={`btn-3d-menu flex w-full items-center justify-between gap-3 rounded-[1.15rem] border px-4 py-4 text-left shadow-sm ${
                  empty
                    ? 'cursor-not-allowed border-[var(--border)] bg-[var(--menu-control-bg)] opacity-60'
                    : 'border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]'
                }`}
              >
                <span className="text-[16px] font-semibold text-[var(--text)]">{level.prefixLabel}</span>
                {empty ? (
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">Скоро</span>
                ) : (
                  <span className="text-[13px] font-medium text-[var(--text-muted)]">
                    Пройдено {reviewed}/{pool.length} ›
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {hubTab === 'levels' && browseLevelId && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setBrowseLevelId(null)}
            className="btn-3d-menu rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--text)]"
          >
            ← Все уровни
          </button>
          <p className="text-[14px] font-semibold text-[var(--text)]">{getLevelPrefix(browseLevelId, catalog)}</p>
          <VocabularyTempoToggle value={tempo} onChange={setTempo} />
          <div className="space-y-3">
            {topicList.map((topic) => {
              const pool = wordsForLevelTopic(activeWords, browseLevelId, topic.id)
              if (pool.length === 0) return null
              const reviewed = countWordsInProgress(progress, pool)
              const plannedCount = pickNextSessionWords({
                words: pool,
                progressMap: progress.words,
                size: tempoSize,
              }).length
              return (
                <div
                  key={topic.id}
                  className="rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[17px] font-semibold text-[var(--text)]">
                        {topic.badge} {topic.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{topic.description}</p>
                      <p className="mt-2 text-[12px] font-medium text-[var(--text-muted)]">
                        Пройдено слов: {reviewed}/{pool.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={plannedCount === 0}
                      onClick={() => startTopicSession(browseLevelId, topic.id)}
                      className="btn-3d-menu shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {plannedCount > 0 ? `Учить · ${plannedCount}` : 'Учить'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hubTab === 'learned' && (
        <div className="space-y-3">
          <input
            value={learnedFilter}
            onChange={(event) => setLearnedFilter(event.target.value)}
            placeholder="Поиск по слову или переводу..."
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
          />
          {filteredLearned.length === 0 ? (
            <div className="rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-5 text-[14px] leading-relaxed text-[var(--text-muted)] shadow-sm">
              Пока нет слов в архиве «выучено». Нужны успешные использования в Переводе или Звонке — цикл слов только кладёт в «В деле».
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLearned.map((entry) => (
                <div
                  key={entry.word.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--chat-shell-bg)] px-3 py-3 shadow-sm"
                >
                  <p className="text-[16px] font-bold text-[var(--text)]">{entry.word.en}</p>
                  <p className="text-[13px] text-[var(--text-muted)]">{entry.word.transcription}</p>
                  <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">{entry.word.ru}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {getLevelPrefix(entry.word.primaryLevel, catalog)} ·{' '}
                    {getTopicTitle(entry.word.primaryVocabularyTopic, catalog)}
                    {entry.lastReviewedAt
                      ? ` · ${new Date(entry.lastReviewedAt).toLocaleDateString('ru-RU')}`
                      : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 w-full max-w-[29rem] flex-1 flex-col gap-3 overflow-y-auto pb-3">
          <div className="flex items-center justify-between gap-2 rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold text-[var(--text)]">Слова по уровням</p>
              <p className="text-[13px] text-[var(--text-muted)]">CEFR A1–C2, темы и архив выученных слов.</p>
            </div>
            <button
              type="button"
              onClick={onBackToLessons}
              className="btn-3d-menu rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--text)]"
            >
              К урокам
            </button>
          </div>

          {loading ? (
            <div className="rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-5 text-center text-[15px] text-[var(--text)] shadow-sm">
              Загружаю словарь...
            </div>
          ) : loadError ? (
            <div className="rounded-[1.15rem] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-5 text-center text-[14px] text-[var(--status-warning-text)] shadow-sm">
              {loadError}
            </div>
          ) : session ? (
            <VocabularyThinSession
              key={sessionKey}
              words={session.words}
              distractorPool={session.distractorPool}
              route={session.route}
              tempo={session.tempo}
              routeTitle={session.routeTitle}
              setProgress={setProgress}
              onFooterViewChange={onFooterViewChange}
              onHandoffTranslation={() => onOpenTranslationWithHandoff?.()}
              onAgain={handleAgain}
              onExit={() => setSession(null)}
            />
          ) : (
            hubBody
          )}
        </div>
      </div>
    </div>
  )
}
