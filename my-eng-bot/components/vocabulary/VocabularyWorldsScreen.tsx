'use client'

import React from 'react'
import VocabularyTempoToggle from '@/components/vocabulary/VocabularyTempoToggle'
import VocabularyThinSession from '@/components/vocabulary/VocabularyThinSession'
import { useVocabularyTempo } from '@/hooks/useVocabularyTempo'
import { isWordInProgress } from '@/lib/vocabulary/learned'
import { formatVocabularySessionRouteTitle } from '@/lib/vocabulary/sessionRoute'
import { pickNextSessionWords } from '@/lib/vocabulary/srs'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { VOCABULARY_WORLDS } from '@/lib/vocabulary/worlds'
import type { Audience } from '@/lib/types'
import type {
  NecessaryWord,
  NecessaryWordsCatalog,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyTempo,
  VocabularyWorldId,
} from '@/types/vocabulary'

type ThinSessionLaunch = {
  words: NecessaryWord[]
  route: VocabularySessionRoute
  tempo: VocabularyTempo
  routeTitle: string
  distractorPool: NecessaryWord[]
}

type VocabularyWorldsScreenProps = {
  onBackToLessons: () => void
  audience?: Audience
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onSessionActiveChange?: (active: boolean) => void
  onRegisterLeaveHandler?: (handler: (() => void) | null) => void
  exitRequestKey?: number
  onOpenTranslationWithHandoff?: () => void
  onOpenCallWithHandoff?: () => void
}

function getWorldTitle(worldId: VocabularyWorldId): string {
  return VOCABULARY_WORLDS.find((world) => world.id === worldId)?.title ?? 'Мир'
}

function buildWorldCounts(words: NecessaryWord[]): Record<VocabularyWorldId, NecessaryWord[]> {
  return words.reduce<Record<VocabularyWorldId, NecessaryWord[]>>(
    (acc, word) => {
      acc[word.primaryWorld].push(word)
      return acc
    },
    { home: [], school: [], travel: [], digital: [], core: [] }
  )
}

function countWordsInProgress(state: VocabularyProgressState, words: NecessaryWord[]): number {
  return words.filter((word) => isWordInProgress(state.words[String(word.id)])).length
}

export default function VocabularyWorldsScreen({
  onBackToLessons,
  audience = 'adult',
  onFooterViewChange,
  onSessionActiveChange,
  onRegisterLeaveHandler,
  exitRequestKey = 0,
  onOpenTranslationWithHandoff,
  onOpenCallWithHandoff,
}: VocabularyWorldsScreenProps) {
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [session, setSession] = React.useState<ThinSessionLaunch | null>(null)
  const [sessionKey, setSessionKey] = React.useState(0)
  const [showStats, setShowStats] = React.useState(false)
  const { tempo, setTempo, size: tempoSize } = useVocabularyTempo()
  const lastWorldRef = React.useRef<VocabularyWorldId | null>(null)

  React.useEffect(() => {
    setProgress(loadVocabularyProgress())
  }, [])

  React.useEffect(() => {
    onRegisterLeaveHandler?.(() => setSession(null))
    return () => onRegisterLeaveHandler?.(null)
  }, [onRegisterLeaveHandler])

  React.useEffect(() => {
    if (exitRequestKey <= 0) return
    setSession(null)
  }, [exitRequestKey])

  React.useEffect(() => {
    let active = true
    async function loadCatalog() {
      try {
        setLoading(true)
        setLoadError(null)
        const response = await fetch('/data/vocabulary/necessary-words.json')
        const data = (await response.json()) as NecessaryWordsCatalog
        if (!response.ok) throw new Error('Не удалось загрузить словарь.')
        if (!active) return
        setCatalog(data)
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
  const worldMap = React.useMemo(() => buildWorldCounts(activeWords), [activeWords])

  React.useEffect(() => {
    if (session) return
    onFooterViewChange?.({
      dynamicText: showStats ? 'Смотри, как растёт прогресс по словам.' : 'Выбери мир и начни короткую сессию.',
      staticText: showStats ? 'Необходимые слова | Статистика' : 'Необходимые слова | Карта миров',
      typingKey: showStats ? 'vocab-stats-footer' : 'vocab-hub-footer',
    })
  }, [onFooterViewChange, session, showStats])

  const startWorldSession = React.useCallback(
    (worldId: VocabularyWorldId) => {
      const pool = worldMap[worldId] ?? []
      const plannedWords = pickNextSessionWords({
        words: pool,
        progressMap: progress.words,
        size: tempoSize,
      })
      if (plannedWords.length === 0) return
      lastWorldRef.current = worldId
      setSession({
        words: plannedWords,
        route: { kind: 'world', worldId },
        tempo,
        routeTitle: getWorldTitle(worldId),
        distractorPool: pool,
      })
      setSessionKey((key) => key + 1)
      setShowStats(false)
    },
    [progress.words, tempo, tempoSize, worldMap]
  )

  const handleAgain = React.useCallback(() => {
    const worldId = lastWorldRef.current
    if (!worldId) {
      setSession(null)
      return
    }
    const latest = loadVocabularyProgress()
    setProgress(latest)
    const pool = worldMap[worldId] ?? []
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
      route: { kind: 'world', worldId },
      tempo,
      routeTitle: getWorldTitle(worldId),
      distractorPool: pool,
    })
    setSessionKey((key) => key + 1)
  }, [tempo, tempoSize, worldMap])

  const worldCards = VOCABULARY_WORLDS.map((world) => {
    const words = worldMap[world.id] ?? []
    const reviewed = countWordsInProgress(progress, words)
    const unlocked = words.length > 0
    return { world, words, reviewed, unlocked }
  })

  if (session) {
    return (
      <VocabularyThinSession
        key={sessionKey}
        words={session.words}
        distractorPool={session.distractorPool}
        route={session.route}
        tempo={session.tempo}
        routeTitle={session.routeTitle}
        audience={audience}
        setProgress={setProgress}
        onFooterViewChange={onFooterViewChange}
        onSessionActiveChange={onSessionActiveChange}
        onHandoffTranslation={() => onOpenTranslationWithHandoff?.()}
        onHandoffCall={onOpenCallWithHandoff ? () => onOpenCallWithHandoff() : undefined}
        onAgain={handleAgain}
        onExit={() => setSession(null)}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
          <div className="mx-auto flex min-h-0 w-full max-w-[29rem] flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2 rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold text-[var(--text)]">Самые необходимые слова</p>
              <p className="text-[13px] text-[var(--text-muted)]">Короткие сессии, миры и мягкое повторение.</p>
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
              Загружаю самые необходимые слова...
            </div>
          ) : loadError ? (
            <div className="rounded-[1.15rem] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-5 text-center text-[14px] text-[var(--status-warning-text)] shadow-sm">
              {loadError}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-3 py-3 shadow-sm">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">В деле</p>
                  <p className="mt-1 text-[22px] font-bold text-[var(--text)]">
                    {Object.values(progress.words).filter((item) => item.feedStatus === 'in_feed').length}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-3 py-3 shadow-sm">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Сессии</p>
                  <p className="mt-1 text-[22px] font-bold text-[var(--text)]">{progress.stats.completedSessions}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-[var(--text-muted)]">Выбери мир и начни сессию.</p>
                <button
                  type="button"
                  onClick={() => setShowStats((value) => !value)}
                  className="btn-3d-menu rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--text)]"
                >
                  {showStats ? 'Скрыть' : 'Статистика'}
                </button>
              </div>

              {showStats && (
                <div className="rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-4 shadow-sm">
                  <p className="text-[15px] font-semibold text-[var(--text)]">Локальная история</p>
                  <div className="mt-3 space-y-2 text-[13px] text-[var(--text-muted)]">
                    {progress.history.length === 0 ? (
                      <p>Пока нет завершённых сессий. Начни с любого открытого мира.</p>
                    ) : (
                      progress.history.slice(0, 5).map((item) => (
                        <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2">
                          <p className="font-semibold text-[var(--text)]">{formatVocabularySessionRouteTitle(item.route)}</p>
                          <p>
                            {item.reviewedWordIds.length} слов
                            {item.bankedWordIds?.length != null ? `, ${item.bankedWordIds.length} в деле` : ''}
                            , {new Date(item.completedAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {!showStats && <VocabularyTempoToggle value={tempo} onChange={setTempo} />}

              <div className="space-y-3 overflow-y-auto pb-2">
                {worldCards.map(({ world, words, reviewed, unlocked }) => {
                  const plannedCount = unlocked
                    ? pickNextSessionWords({
                        words,
                        progressMap: progress.words,
                        size: tempoSize,
                      }).length
                    : 0
                  return (
                  <div
                    key={world.id}
                    className={`rounded-[1.15rem] border px-4 py-4 shadow-sm ${
                      unlocked
                        ? 'border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]'
                        : 'border-[var(--border)] bg-[var(--menu-control-bg)] opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[17px] font-semibold text-[var(--text)]">
                          {world.badge} {world.title}
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{world.description}</p>
                        <p className="mt-2 text-[12px] font-medium text-[var(--text-muted)]">
                          Пройдено слов: {reviewed}/{words.length}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!unlocked || plannedCount === 0}
                        onClick={() => startWorldSession(world.id)}
                        className="btn-3d-menu rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {!unlocked ? 'Закрыт' : plannedCount > 0 ? `Учить · ${plannedCount}` : 'Учить'}
                      </button>
                    </div>
                  </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
