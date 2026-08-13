'use client'

import React from 'react'
import MyPlanCard from '@/components/myPlan/MyPlanCard'
import MyPlanCardFooterButton from '@/components/myPlan/MyPlanCardFooterButton'
import VocabularyBridgeScreen from '@/components/vocabulary/VocabularyBridgeScreen'
import VocabularyListScreen from '@/components/vocabulary/VocabularyListScreen'
import VocabularyPackImportScreen from '@/components/vocabulary/VocabularyPackImportScreen'
import VocabularySpaceScroll from '@/components/vocabulary/VocabularySpaceScroll'
import VocabularyTempoToggle from '@/components/vocabulary/VocabularyTempoToggle'
import VocabularyThinSession from '@/components/vocabulary/VocabularyThinSession'
import VocabularyWordRow from '@/components/vocabulary/VocabularyWordRow'
import { useVocabularyTempo } from '@/hooks/useVocabularyTempo'
import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import { customPackToNecessaryWords } from '@/lib/vocabulary/customPackAdapter'
import {
  loadPackWords,
  pauseSessionWords,
  pickVocabFuel,
  rankVocabNowCta,
  type VocabNowKind,
} from '@/lib/vocabulary/fuel'
import { isWordInProgress } from '@/lib/vocabulary/learned'
import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
  patchWordProgress,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { lemmaKeyFromEn, listByFeedStatus, setUserMark } from '@/lib/vocabulary/wordFeed'
import { vocabHubCopy, vocabHubFooter, vocabNowBody } from '@/lib/uiCopy/vocabularyHub'
import { createEmptyWordProgress, pickNextSessionWords } from '@/lib/vocabulary/srs'
import { VOCABULARY_WORLDS } from '@/lib/vocabulary/worlds'
import type { Audience } from '@/lib/types'
import type {
  NecessaryWord,
  NecessaryWordsCatalog,
  VocabularyFocusLemma,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyWorldId,
} from '@/types/vocabulary'

type HubView = 'hub' | 'list' | 'import' | 'session' | 'bridge'
type HubWordsTab = 'unlearned' | 'learned'

function uniqueWords(words: NecessaryWord[]): NecessaryWord[] {
  const seen = new Set<number>()
  const result: NecessaryWord[] = []
  for (const word of words) {
    if (seen.has(word.id)) continue
    seen.add(word.id)
    result.push(word)
  }
  return result
}

function countReviewed(words: NecessaryWord[], map: VocabularyProgressState['words']): number {
  return words.filter((word) => isWordInProgress(map[String(word.id)])).length
}

type ListKey =
  | { kind: 'world'; worldId: VocabularyWorldId }
  | { kind: 'errors' }
  | { kind: 'pack'; packId: string }
  | { kind: 'vitrine' }

type Props = {
  audience?: Audience
  onBackToLessons: () => void
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onSessionActiveChange?: (active: boolean) => void
  onRegisterLeaveHandler?: (handler: (() => void) | null) => void
  exitRequestKey?: number
  onOpenTranslationWithHandoff?: () => void
  onOpenCallWithHandoff?: () => void
  onOpenByLevel?: () => void
}

function resolveMistakeWords(catalog: NecessaryWord[], packWords: NecessaryWord[]): NecessaryWord[] {
  const pool = [...catalog, ...packWords]
  const mistakes = loadVocabMistakes()
  const result: NecessaryWord[] = []
  for (const item of mistakes) {
    const found = pool.find((word) => lemmaKeyFromEn(word.en) === item.lemmaKey)
    if (found && !result.some((row) => row.id === found.id)) result.push(found)
  }
  for (const word of pool) {
    const progress = loadVocabularyProgress().words[String(word.id)]
    if (progress?.feedStatus === 'returned' && !result.some((row) => row.id === word.id)) result.push(word)
  }
  return result
}

export default function VocabularyHubScreen({
  audience = 'adult',
  onBackToLessons,
  onFooterViewChange,
  onSessionActiveChange,
  onRegisterLeaveHandler,
  exitRequestKey = 0,
  onOpenTranslationWithHandoff,
  onOpenCallWithHandoff,
  onOpenByLevel,
}: Props) {
  const copy = vocabHubCopy(audience)
  const { tempo, setTempo, size: tempoSize } = useVocabularyTempo()
  const [view, setView] = React.useState<HubView>('hub')
  const [listKey, setListKey] = React.useState<ListKey | null>(null)
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [sessionWords, setSessionWords] = React.useState<NecessaryWord[]>([])
  const [sessionRoute, setSessionRoute] = React.useState<VocabularySessionRoute>({ kind: 'world', worldId: 'home' })
  const [sessionKey, setSessionKey] = React.useState(0)
  const [bridgeLemmas, setBridgeLemmas] = React.useState<VocabularyFocusLemma[]>([])
  const [nowKind, setNowKind] = React.useState<VocabNowKind>('empty')
  const [wordsTab, setWordsTab] = React.useState<HubWordsTab>('unlearned')
  const [hubQuery, setHubQuery] = React.useState('')
  const [hubShown, setHubShown] = React.useState(20)

  const activeWords = React.useMemo(
    () => (catalog?.words ?? []).filter((word) => word.status === 'active'),
    [catalog]
  )
  const packWords = React.useMemo(() => loadPackWords(), [progress, view])
  const packs = React.useMemo(() => loadCustomWordPacks(), [progress, view])

  const refreshNow = React.useCallback(
    (words: NecessaryWord[], map: VocabularyProgressState['words']) => {
      setNowKind(
        rankVocabNowCta({
          words,
          progressMap: map,
          packWords: loadPackWords(),
        })
      )
    },
    []
  )

  React.useEffect(() => {
    setProgress(loadVocabularyProgress())
  }, [view])

  React.useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const response = await fetch('/data/vocabulary/necessary-words.json')
        const data = (await response.json()) as NecessaryWordsCatalog
        if (!alive || !response.ok) return
        setCatalog(data)
        const words = (data.words ?? []).filter((word) => word.status === 'active')
        void import('@/lib/vocabulary/catalogCache').then((mod) => mod.setCachedNecessaryWords(words))
        refreshNow(words, loadVocabularyProgress().words)
      } catch {
        // ignore
      }
    })()
    return () => {
      alive = false
    }
  }, [refreshNow])

  React.useEffect(() => {
    onRegisterLeaveHandler?.(() => {
      setView('hub')
      setSessionWords([])
    })
    return () => onRegisterLeaveHandler?.(null)
  }, [onRegisterLeaveHandler])

  React.useEffect(() => {
    if (exitRequestKey <= 0) return
    setView('hub')
    setSessionWords([])
  }, [exitRequestKey])

  React.useEffect(() => {
    if (view !== 'hub') return
    const footer = vocabHubFooter(nowKind)
    onFooterViewChange?.({
      dynamicText: footer.dynamicText,
      staticText: footer.staticText,
      typingKey: `vocab-hub-${nowKind}`,
    })
    return () => onFooterViewChange?.(null)
  }, [nowKind, onFooterViewChange, view])

  const poolWords = React.useMemo(() => uniqueWords([...activeWords, ...packWords]), [activeWords, packWords])
  const unlearnedWords = React.useMemo(
    () => poolWords.filter((word) => progress.words[String(word.id)]?.feedStatus !== 'mastered'),
    [poolWords, progress.words]
  )
  const learnedWords = React.useMemo(
    () => listByFeedStatus(poolWords, progress.words, 'mastered'),
    [poolWords, progress.words]
  )
  const hubTabWords = wordsTab === 'learned' ? learnedWords : unlearnedWords
  const hubFilteredWords = React.useMemo(() => {
    const q = hubQuery.trim().toLowerCase()
    if (!q) return hubTabWords
    return hubTabWords.filter(
      (word) => word.en.toLowerCase().includes(q) || word.ru.toLowerCase().includes(q)
    )
  }, [hubQuery, hubTabWords])
  const hubVisibleWords = hubFilteredWords.slice(0, hubShown)
  const errorCount = resolveMistakeWords(activeWords, packWords).length
  const nowBody = vocabNowBody(nowKind, audience)
  const nowCtaLabel = nowBody.cta === 'say' ? copy.say : nowBody.cta === 'pick' ? copy.pick : copy.start

  const worldPool = (worldId: VocabularyWorldId) =>
    activeWords.filter((word) => word.primaryWorld === worldId)

  const fuelLemmas = (words: NecessaryWord[] = activeWords, extraPack: NecessaryWord[] = packWords) =>
    pickVocabFuel({
      words,
      progressMap: progress.words,
      packWords: extraPack,
      n: tempoSize,
      mistakeLemmaKeys: new Set(loadVocabMistakes().map((item) => item.lemmaKey)),
    })

  const lemmasToWords = (lemmas: VocabularyFocusLemma[]) => {
    const pool = [...activeWords, ...packWords]
    return lemmas
      .map((lemma) => pool.find((word) => word.id === lemma.wordId || lemmaKeyFromEn(word.en) === lemma.lemmaKey))
      .filter((word): word is NecessaryWord => Boolean(word))
  }

  const pickWorldWords = (worldId: VocabularyWorldId) =>
    pickNextSessionWords({
      words: worldPool(worldId),
      progressMap: progress.words,
      size: tempoSize,
    })

  const startSession = (words: NecessaryWord[], route: VocabularySessionRoute) => {
    if (words.length === 0) {
      setListKey({ kind: 'vitrine' })
      setView('list')
      return
    }
    setSessionWords(words.slice(0, tempoSize))
    setSessionRoute(route)
    setSessionKey((n) => n + 1)
    setView('session')
  }

  const startAgain = () => {
    if (sessionRoute.kind === 'world') {
      startSession(pickWorldWords(sessionRoute.worldId), sessionRoute)
      return
    }
    if (sessionRoute.kind === 'pack') {
      const pack = packs.find((item) => item.id === sessionRoute.packId)
      const words = pack ? customPackToNecessaryWords(pack) : []
      const fromFuel = lemmasToWords(fuelLemmas(words, words))
      startSession(fromFuel.length ? fromFuel : words.slice(0, tempoSize), sessionRoute)
      return
    }
    startSession(lemmasToWords(fuelLemmas()), sessionRoute)
  }

  const startBridge = (lemmas: VocabularyFocusLemma[]) => {
    const next = lemmas.slice(0, 3).filter((lemma) => lemma.en.trim())
    if (next.length === 0) {
      setListKey({ kind: 'vitrine' })
      setView('list')
      return
    }
    setBridgeLemmas(next)
    setView('bridge')
  }

  const handleNow = () => {
    if (nowBody.cta === 'pick') {
      setListKey({ kind: 'vitrine' })
      setView('list')
      return
    }
    if (nowBody.cta === 'say') {
      const bank = listByFeedStatus([...activeWords, ...packWords], progress.words, 'in_feed').slice(0, 3)
      const fromFuel = lemmasToWords(fuelLemmas())
      const source = nowKind === 'errors-bridge' || bank.length === 0 ? fromFuel : bank
      startBridge(
        (source.length ? source : bank).map((word) => ({
          en: word.en,
          ru: word.ru,
          wordId: word.id,
          lemmaKey: lemmaKeyFromEn(word.en),
        }))
      )
      return
    }
    if (nowKind === 'pause') {
      startSession(pauseSessionWords({ words: activeWords, progressMap: progress.words, n: 2 }), {
        kind: 'world',
        worldId: 'home',
      })
      return
    }
    startSession(lemmasToWords(fuelLemmas()), { kind: 'world', worldId: 'home' })
  }

  const persistMark = (word: NecessaryWord, mark: 'study' | 'know' | null) => {
    const current = progress.words[String(word.id)] ?? createEmptyWordProgress(word.id)
    const nextState = patchWordProgress(progress, word.id, setUserMark({ ...current, lemmaKey: lemmaKeyFromEn(word.en) }, mark))
    saveVocabularyProgress(nextState)
    setProgress(nextState)
    refreshNow(activeWords, nextState.words)
  }

  const listBundle = (): { title: string; words: NecessaryWord[]; showMarks: boolean; sticky: string | null } => {
    if (!listKey) return { title: copy.spaceTitle, words: [], showMarks: false, sticky: null }
    if (listKey.kind === 'world' || listKey.kind === 'vitrine') {
      const worldId = listKey.kind === 'world' ? listKey.worldId : 'home'
      const title = VOCABULARY_WORLDS.find((world) => world.id === worldId)?.title ?? copy.vitrine
      let words = worldPool(worldId)
      if (listKey.kind === 'vitrine') words = words.slice(0, 12)
      return { title, words, showMarks: true, sticky: copy.studyList }
    }
    if (listKey.kind === 'pack') {
      const pack = packs.find((item) => item.id === listKey.packId)
      return {
        title: pack?.title ?? copy.myLists,
        words: pack ? customPackToNecessaryWords(pack) : [],
        showMarks: true,
        sticky: copy.studyList,
      }
    }
    return { title: 'Ошибки', words: resolveMistakeWords(activeWords, packWords), showMarks: false, sticky: copy.start }
  }

  if (view === 'session' && sessionWords.length > 0) {
    return (
      <VocabularyThinSession
        key={sessionKey}
        words={sessionWords}
        distractorPool={activeWords}
        route={sessionRoute}
        tempo={tempo}
        routeTitle="Слова"
        audience={audience}
        setProgress={setProgress}
        onFooterViewChange={onFooterViewChange}
        onSessionActiveChange={onSessionActiveChange}
        onHandoffTranslation={() => onOpenTranslationWithHandoff?.()}
        onHandoffCall={() => onOpenCallWithHandoff?.()}
        onOpenBridge={(banked) =>
          startBridge(
            banked.map((word) => ({
              en: word.en,
              ru: word.ru,
              wordId: word.id,
              lemmaKey: lemmaKeyFromEn(word.en),
            }))
          )
        }
        onAgain={startAgain}
        onExit={() => setView('hub')}
      />
    )
  }

  if (view === 'bridge') {
    return (
      <VocabularyBridgeScreen
        lemmas={bridgeLemmas}
        words={activeWords}
        audience={audience}
        onDone={() => {
          setProgress(loadVocabularyProgress())
          setView('hub')
        }}
        onFooterViewChange={onFooterViewChange}
      />
    )
  }

  if (view === 'import') {
    return (
      <VocabularyPackImportScreen
        catalog={activeWords}
        onBack={() => setView('hub')}
        onSaved={() => {
          setProgress(loadVocabularyProgress())
          setView('hub')
        }}
      />
    )
  }

  if (view === 'list' && listKey) {
    const bundle = listBundle()
    return (
      <VocabularyListScreen
        title={bundle.title}
        audience={audience}
        words={bundle.words}
        progressMap={progress.words}
        showMarks={bundle.showMarks}
        stickyLabel={bundle.sticky}
        allowSearch={listKey.kind === 'pack' || audience === 'adult'}
        onBack={() => setView('hub')}
        onStudy={(word) => persistMark(word, 'study')}
        onKnow={(word) => persistMark(word, 'know')}
        onSticky={() => {
          if (listKey.kind === 'errors' && nowKind === 'errors-bridge') {
            startBridge(
              bundle.words.slice(0, 3).map((word) => ({
                en: word.en,
                ru: word.ru,
                wordId: word.id,
                lemmaKey: lemmaKeyFromEn(word.en),
              }))
            )
            return
          }
          if (listKey.kind === 'world' || listKey.kind === 'vitrine') {
            const worldId = listKey.kind === 'world' ? listKey.worldId : 'home'
            startSession(pickWorldWords(worldId), { kind: 'world', worldId })
            return
          }
          const fromList = lemmasToWords(
            fuelLemmas(bundle.words, listKey.kind === 'pack' ? bundle.words : packWords)
          )
          const fallback = bundle.words
            .filter((word) => {
              const mark = progress.words[String(word.id)]?.userMark
              return mark === 'study' || listKey.kind === 'pack' || listKey.kind === 'errors'
            })
            .slice(0, tempoSize)
          startSession(
            fromList.length ? fromList : fallback,
            listKey.kind === 'pack' ? { kind: 'pack', packId: listKey.packId } : { kind: 'world', worldId: 'home' }
          )
        }}
      />
    )
  }

  const worlds = audience === 'child' ? VOCABULARY_WORLDS.filter((world) => world.id !== 'core') : VOCABULARY_WORLDS

  return (
    <VocabularySpaceScroll>
        <div className="flex items-center justify-between px-1">
          <p className="text-[17px] font-semibold text-[var(--text)]">{copy.spaceTitle}</p>
          <button type="button" onClick={onBackToLessons} className="text-[14px] font-semibold text-[var(--text)]">
            {copy.back}
          </button>
        </div>

        <MyPlanCard
          title={copy.nowTitle}
          footer={
            <MyPlanCardFooterButton variant="launch" label={nowCtaLabel} onClick={handleNow} />
          }
        >
          <p className="text-[15px] font-semibold text-[var(--text)]">{nowBody.title}</p>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{nowBody.reason}</p>
        </MyPlanCard>

        {errorCount > 0 ? (
          <button
            type="button"
            className="px-1 text-left text-[13px] text-[var(--text-muted)]"
            onClick={() => {
              setListKey({ kind: 'errors' })
              setView('list')
            }}
          >
            {copy.debtErrors(errorCount)}
          </button>
        ) : null}

        <div className="space-y-3">
          <VocabularyTempoToggle value={tempo} onChange={setTempo} />
          {worlds.map((world) => {
            const words = worldPool(world.id)
            const reviewed = countReviewed(words, progress.words)
            const planned = pickNextSessionWords({
              words,
              progressMap: progress.words,
              size: tempoSize,
            })
            const plannedCount = planned.length
            return (
              <div
                key={world.id}
                className="rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setListKey({ kind: 'world', worldId: world.id })
                      setView('list')
                    }}
                  >
                    <p className="text-[17px] font-semibold text-[var(--text)]">
                      {world.badge} {world.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{world.description}</p>
                    <p className="mt-2 text-[12px] font-medium text-[var(--text-muted)]">
                      Пройдено слов: {reviewed}/{words.length}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={plannedCount === 0}
                    onClick={() => startSession(planned, { kind: 'world', worldId: world.id })}
                    className="btn-3d-menu shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {plannedCount > 0 ? `Учить · ${plannedCount}` : 'Учить'}
                  </button>
                </div>
              </div>
            )
          })}
          {audience === 'adult' && onOpenByLevel ? (
            <button
              type="button"
              className="flex w-full min-h-[44px] items-center justify-between rounded-[1.15rem] border border-[var(--border)] bg-[var(--menu-card-bg)] px-4 py-3 text-left text-[15px] text-[var(--text-muted)]"
              onClick={onOpenByLevel}
            >
              По уровню
              <span>›</span>
            </button>
          ) : null}
        </div>

        <div className="flex gap-2 rounded-[1rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] p-1 shadow-sm">
          {(
            [
              { id: 'unlearned' as const, label: copy.tabUnlearned, count: unlearnedWords.length },
              { id: 'learned' as const, label: copy.tabLearned, count: learnedWords.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setWordsTab(tab.id)
                setHubShown(20)
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ${
                wordsTab === tab.id ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'
              }`}
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>

        <input
          value={hubQuery}
          onChange={(event) => {
            setHubQuery(event.target.value)
            setHubShown(20)
          }}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
        />

        <div className="space-y-2">
          {hubVisibleWords.map((word) => {
            const row = progress.words[String(word.id)]
            return (
              <VocabularyWordRow
                key={word.id}
                word={word}
                showMarks={wordsTab === 'unlearned'}
                studyActive={row?.userMark === 'study'}
                knowActive={row?.userMark === 'know'}
                onStudy={() => persistMark(word, 'study')}
                onKnow={() => persistMark(word, 'know')}
              />
            )
          })}
          {hubFilteredWords.length > hubShown ? (
            <button
              type="button"
              className="w-full py-2 text-[14px] text-[var(--text-muted)]"
              onClick={() => setHubShown((n) => n + 20)}
            >
              {copy.more}
            </button>
          ) : null}
          {hubFilteredWords.length === 0 ? (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--chat-shell-bg)] px-3 py-4 text-[14px] text-[var(--text-muted)]">
              {hubQuery.trim()
                ? copy.emptyList
                : wordsTab === 'learned'
                  ? copy.learnedEmpty
                  : copy.unlearnedEmpty}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
          {packs.length === 0 ? (
            <button
              type="button"
              className="flex w-full min-h-[44px] items-center justify-between px-3 py-2.5 text-left text-[15px]"
              onClick={() => setView('import')}
            >
              {copy.fillList}
              <span className="text-[var(--text-muted)]">›</span>
            </button>
          ) : (
            <>
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="flex w-full min-h-[44px] items-center justify-between border-b border-[var(--border)]/70 px-3 py-2.5 text-left text-[15px]"
                  onClick={() => {
                    setListKey({ kind: 'pack', packId: pack.id })
                    setView('list')
                  }}
                >
                  {pack.title}
                  <span className="text-[var(--text-muted)]">›</span>
                </button>
              ))}
              <button
                type="button"
                className="flex w-full min-h-[44px] items-center justify-between px-3 py-2.5 text-left text-[15px]"
                onClick={() => setView('import')}
              >
                {copy.fillList}
                <span className="text-[var(--text-muted)]">›</span>
              </button>
            </>
          )}
        </div>
    </VocabularySpaceScroll>
  )
}
