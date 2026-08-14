'use client'

import React from 'react'
import VocabularyBridgeScreen from '@/components/vocabulary/VocabularyBridgeScreen'
import VocabularyListScreen from '@/components/vocabulary/VocabularyListScreen'
import VocabularyPackImportScreen from '@/components/vocabulary/VocabularyPackImportScreen'
import VocabularyThinSession from '@/components/vocabulary/VocabularyThinSession'
import VocabCard from '@/components/vocabulary/VocabCard'
import VocabCardFooterButton from '@/components/vocabulary/VocabCardFooterButton'
import VocabHubShell from '@/components/vocabulary/VocabHubShell'
import VocabShelfRow from '@/components/vocabulary/VocabShelfRow'
import { useVocabularyTempo } from '@/hooks/useVocabularyTempo'
import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import { customPackToNecessaryWords } from '@/lib/vocabulary/customPackAdapter'
import { isPackDrained } from '@/lib/vocabulary/resolveImportRows'
import {
  VOCAB_CARD_BODY_REASON,
  VOCAB_CARD_BODY_TITLE,
  VOCAB_CARD_HEADER,
  VOCAB_CARD_HEADER_TITLE,
  VOCAB_CARD_SURFACE,
  VOCAB_SHELF_CHIP,
  VOCAB_SHELF_CHIP_ACTIVE,
  VOCAB_STATUS_TILE,
} from '@/lib/vocabulary/cardStyles'
import {
  loadPackWords,
  pauseSessionWords,
  pickVocabFuel,
  rankVocabNowCta,
  type VocabNowKind,
} from '@/lib/vocabulary/fuel'
import {
  hubDisplayTiles,
  listByDisplayFilter,
  uniqueWords,
  type HubTileId,
  type VocabDisplayFilterId,
} from '@/lib/vocabulary/hubBuckets'
import { isWordInProgress } from '@/lib/vocabulary/learned'
import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
  patchWordProgress,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { writeVocabTranslationHandoff } from '@/lib/vocabulary/translationHandoff'
import { lemmaKeyFromEn, listByFeedStatus, setUserMark } from '@/lib/vocabulary/wordFeed'
import { vocabHubCopy, vocabHubFooter, vocabNowBody, vocabDisplayLabel, vocabShelfLabel, vocabTileLabel, VOCAB_DISPLAY_CHIP_ORDER } from '@/lib/uiCopy/vocabularyHub'
import { PHRASEBOOK_COPY } from '@/lib/uiCopy/phrasebook'
import { loadActivePhrasebookTopicId, saveActivePhrasebookTopicId } from '@/lib/phrasebook/activeTopic'
import { PHRASEBOOK_TOPICS, isPhrasebookTopicId, type PhrasebookTopicId } from '@/lib/phrasebook/topics'
import { resolvePhrasebookWords } from '@/lib/phrasebook/toNecessaryWords'
import { createEmptyWordProgress, pickNextSessionWords, sessionSizeForTempo } from '@/lib/vocabulary/srs'
import { VOCABULARY_WORLDS } from '@/lib/vocabulary/worlds'
import type { Audience } from '@/lib/types'
import type {
  NecessaryWord,
  NecessaryWordsCatalog,
  VocabularyFocusLemma,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyTempo,
  VocabularyWorldId,
} from '@/types/vocabulary'

type HubView = 'hub' | 'catalog' | 'list' | 'import' | 'session' | 'bridge' | 'shelves' | 'phrasebook' | 'phrasebook-list'

/** Equal chip width: one third of the row minus two `gap-2` gutters. */
const SHELF_CHIP_THIRD_CLASS = 'w-full'

function ShelfFilterChip({
  id,
  label,
  selected,
  widthClass,
  onPick,
}: {
  id: VocabDisplayFilterId
  label: string
  selected: boolean
  widthClass: string
  onPick: (id: VocabDisplayFilterId) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`${VOCAB_SHELF_CHIP} ${widthClass} ${selected ? VOCAB_SHELF_CHIP_ACTIVE : ''}`}
      onClick={() => onPick(id)}
    >
      {label}
    </button>
  )
}

function countReviewed(words: NecessaryWord[], map: VocabularyProgressState['words']): number {
  return words.filter((word) => isWordInProgress(map[String(word.id)])).length
}

function HubNavCard({
  title,
  ariaLabel,
  onClick,
  children,
}: {
  title: string
  ariaLabel: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`${VOCAB_CARD_SURFACE} block w-full min-w-0 cursor-pointer text-left touch-manipulation active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]`}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <div className={VOCAB_CARD_HEADER}>
        <p className={VOCAB_CARD_HEADER_TITLE}>{title}</p>
      </div>
      <div className="flex items-center gap-3 border-t border-[var(--chat-section-card-divider)] bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
        <span className="pointer-events-none inline-flex h-5 w-5 shrink-0 items-center justify-center text-[var(--text-muted)]" aria-hidden>
          <svg
            className="h-full w-full rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.25}
              d="M6 14.5 12 8.5l6 6"
            />
          </svg>
        </span>
      </div>
    </button>
  )
}

type ListKey =
  | { kind: 'world'; worldId: VocabularyWorldId }
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
  initialView?: 'hub' | 'phrasebook'
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
  initialView = 'hub',
}: Props) {
  const copy = vocabHubCopy(audience)
  const { tempo, setTempo, size: tempoSize } = useVocabularyTempo()
  const [view, setView] = React.useState<HubView>(initialView === 'phrasebook' ? 'phrasebook' : 'hub')
  const [phrasebookTopicId, setPhrasebookTopicId] = React.useState<PhrasebookTopicId>(loadActivePhrasebookTopicId)
  const [listKey, setListKey] = React.useState<ListKey | null>(null)
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [sessionWords, setSessionWords] = React.useState<NecessaryWord[]>([])
  const [sessionRoute, setSessionRoute] = React.useState<VocabularySessionRoute>({ kind: 'world', worldId: 'home' })
  const [sessionKey, setSessionKey] = React.useState(0)
  const [bridgeLemmas, setBridgeLemmas] = React.useState<VocabularyFocusLemma[]>([])
  const [nowKind, setNowKind] = React.useState<VocabNowKind>('empty')
  const [shelfFilter, setShelfFilter] = React.useState<VocabDisplayFilterId>(null)
  const [shelfQuery, setShelfQuery] = React.useState('')
  const [shelfShown, setShelfShown] = React.useState(20)

  const activeWords = React.useMemo(
    () => (catalog?.words ?? []).filter((word) => word.status === 'active'),
    [catalog]
  )
  const packWords = React.useMemo(() => loadPackWords(), [progress, view])
  const phrasebookWords = React.useMemo(
    () => resolvePhrasebookWords(phrasebookTopicId, activeWords),
    [phrasebookTopicId, activeWords]
  )
  const packs = React.useMemo(() => loadCustomWordPacks(), [progress, view])
  const visiblePacks = React.useMemo(
    () => packs.filter((pack) => !isPackDrained(pack.items, progress.words, activeWords)),
    [activeWords, packs, progress.words]
  )
  const mistakes = React.useMemo(() => loadVocabMistakes(), [progress, view])
  const poolWords = React.useMemo(() => uniqueWords([...activeWords, ...packWords]), [activeWords, packWords])
  const shelvedRows = React.useMemo(
    () =>
      listByDisplayFilter({
        words: poolWords,
        progressMap: progress.words,
        mistakes,
        audience,
        filter: shelfFilter,
      }),
    [audience, mistakes, poolWords, progress.words, shelfFilter]
  )
  const shelvedAllCount = React.useMemo(
    () =>
      listByDisplayFilter({
        words: poolWords,
        progressMap: progress.words,
        mistakes,
        audience,
      }).length,
    [audience, mistakes, poolWords, progress.words]
  )

  const refreshNow = React.useCallback((words: NecessaryWord[], map: VocabularyProgressState['words']) => {
    setNowKind(
      rankVocabNowCta({
        words,
        progressMap: map,
        packWords: loadPackWords(),
        phrasebookWords: resolvePhrasebookWords(loadActivePhrasebookTopicId(), words),
      })
    )
  }, [])

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

  const resetShelvesNav = React.useCallback(() => {
    setShelfFilter(null)
    setShelfQuery('')
    setShelfShown(20)
  }, [])

  React.useEffect(() => {
    onRegisterLeaveHandler?.(() => {
      setView(initialView === 'phrasebook' ? 'phrasebook' : 'hub')
      setSessionWords([])
      resetShelvesNav()
    })
    return () => onRegisterLeaveHandler?.(null)
  }, [initialView, onRegisterLeaveHandler, resetShelvesNav])

  React.useEffect(() => {
    if (exitRequestKey <= 0) return
    setView(initialView === 'phrasebook' ? 'phrasebook' : 'hub')
    setSessionWords([])
    resetShelvesNav()
  }, [exitRequestKey, initialView, resetShelvesNav])

  React.useEffect(() => {
    if (view === 'session' || view === 'bridge') return
    if (view === 'phrasebook' || view === 'phrasebook-list') {
      onFooterViewChange?.({
        dynamicText: view === 'phrasebook' ? PHRASEBOOK_COPY.footerPick : PHRASEBOOK_COPY.footerList,
        staticText: PHRASEBOOK_COPY.footerStatic,
        typingKey: `vocab-phrasebook-${view}`,
      })
      return () => onFooterViewChange?.(null)
    }
    const footer = vocabHubFooter(nowKind)
    onFooterViewChange?.({
      dynamicText: view === 'shelves' ? copy.shelvesFooterDynamic : footer.dynamicText,
      staticText:
        view === 'catalog' ? copy.catalogScreenTitle : view === 'shelves' ? copy.shelvesFooterStatic : footer.staticText,
      typingKey: `vocab-hub-${nowKind}-${view}`,
    })
    return () => onFooterViewChange?.(null)
  }, [audience, copy.catalogScreenTitle, copy.shelvesFooterDynamic, copy.shelvesFooterStatic, nowKind, onFooterViewChange, view])

  const tiles = hubDisplayTiles({
    audience,
    words: poolWords,
    progressMap: progress.words,
    mistakes,
  })
  const nowBody = vocabNowBody(nowKind, audience)
  const nowCtaLabel = nowBody.cta === 'say' ? copy.say : nowBody.cta === 'pick' ? copy.pick : copy.start

  const worldPool = (worldId: VocabularyWorldId) =>
    activeWords.filter((word) => word.primaryWorld === worldId)

  const fuelLemmas = (words: NecessaryWord[] = activeWords, extraPack: NecessaryWord[] = packWords) =>
    pickVocabFuel({
      words,
      progressMap: progress.words,
      packWords: extraPack,
      phrasebookWords,
      n: tempoSize,
      mistakeLemmaKeys: new Set(mistakes.map((item) => item.lemmaKey)),
    })

  const lemmasToWords = (lemmas: VocabularyFocusLemma[]) => {
    const pool = [...activeWords, ...packWords, ...phrasebookWords]
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

  const startSession = (words: NecessaryWord[], route: VocabularySessionRoute, size = tempoSize) => {
    if (words.length === 0) {
      setListKey({ kind: 'vitrine' })
      setView('list')
      return
    }
    setSessionWords(words.slice(0, size))
    setSessionRoute(route)
    setSessionKey((n) => n + 1)
    setView('session')
  }

  const startWorldTempo = (worldId: VocabularyWorldId, nextTempo: VocabularyTempo) => {
    const size = sessionSizeForTempo(nextTempo)
    const planned = pickNextSessionWords({
      words: worldPool(worldId),
      progressMap: progress.words,
      size,
    })
    setTempo(nextTempo)
    startSession(planned, { kind: 'world', worldId }, size)
  }

  const startAgain = () => {
    if (sessionRoute.kind === 'world') {
      startSession(pickWorldWords(sessionRoute.worldId), sessionRoute)
      return
    }
    if (sessionRoute.kind === 'pack') {
      const pack = packs.find((item) => item.id === sessionRoute.packId)
      const words = pack ? customPackToNecessaryWords(pack, { catalog: activeWords, progressMap: progress.words }) : []
      const fromFuel = lemmasToWords(fuelLemmas(words, words))
      startSession(fromFuel.length ? fromFuel : words.slice(0, tempoSize), sessionRoute)
      return
    }
    if (sessionRoute.kind === 'phrasebook' && isPhrasebookTopicId(sessionRoute.topicId)) {
      const pool = resolvePhrasebookWords(sessionRoute.topicId, activeWords).filter(
        (word) => progress.words[String(word.id)]?.userMark !== 'know'
      )
      startSession(
        pickNextSessionWords({ words: pool, progressMap: progress.words, size: tempoSize }),
        sessionRoute
      )
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
      const bank = listByFeedStatus(poolWords, progress.words, 'in_feed').slice(0, 3)
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
    const nextState = patchWordProgress(
      progress,
      word.id,
      setUserMark({ ...current, lemmaKey: lemmaKeyFromEn(word.en) }, mark)
    )
    saveVocabularyProgress(nextState)
    setProgress(nextState)
    refreshNow(activeWords, nextState.words)
  }

  const openTile = (id: HubTileId) => {
    setShelfFilter(id)
    setShelfQuery('')
    setShelfShown(20)
    setView('shelves')
  }

  const backToHub = () => {
    setView('hub')
    setListKey(null)
    resetShelvesNav()
  }

  const listBundle = (): {
    title: string
    words: NecessaryWord[]
    showMarks: boolean
    sticky: string | null
    empty: string
  } => {
    if (!listKey) return { title: copy.spaceTitle, words: [], showMarks: false, sticky: null, empty: copy.emptyList }
    if (listKey.kind === 'world' || listKey.kind === 'vitrine') {
      const worldId = listKey.kind === 'world' ? listKey.worldId : 'home'
      const title = VOCABULARY_WORLDS.find((world) => world.id === worldId)?.title ?? copy.vitrine
      let words = worldPool(worldId)
      if (listKey.kind === 'vitrine') words = words.slice(0, 12)
      return { title, words, showMarks: true, sticky: copy.studyList, empty: copy.emptyList }
    }
    if (listKey.kind === 'pack') {
      const pack = packs.find((item) => item.id === listKey.packId)
      return {
        title: pack?.title ?? copy.myLists,
        words: pack ? customPackToNecessaryWords(pack, { catalog: activeWords, progressMap: progress.words }) : [],
        showMarks: true,
        sticky: copy.studyList,
        empty: copy.emptyList,
      }
    }
    return { title: copy.spaceTitle, words: [], showMarks: false, sticky: null, empty: copy.emptyList }
  }

  const handoffShelfWords = (
    words: NecessaryWord[],
    open: 'translation' | 'call',
    allowInboxFallback: boolean
  ) => {
    const picked = words.slice(0, 3)
    const lemmas =
      picked.length > 0
        ? picked.map((word) => ({
            en: word.en,
            ru: word.ru,
            wordId: word.id,
            lemmaKey: lemmaKeyFromEn(word.en),
          }))
        : allowInboxFallback
          ? mistakes.slice(0, 3).map((item) => ({
              en: item.en,
              ru: item.ru ?? '',
              lemmaKey: item.lemmaKey,
            }))
          : []
    if (lemmas.length === 0) return
    writeVocabTranslationHandoff({ lemmas, source: 'feed_browse', loadStudying: true })
    if (open === 'call') onOpenCallWithHandoff?.()
    else onOpenTranslationWithHandoff?.()
  }

  const runListSticky = (bundle: ReturnType<typeof listBundle>) => {
    if (!listKey) return
    if (listKey.kind === 'world' || listKey.kind === 'vitrine') {
      const worldId = listKey.kind === 'world' ? listKey.worldId : 'home'
      startSession(pickWorldWords(worldId), { kind: 'world', worldId })
      return
    }
    const fromList = lemmasToWords(fuelLemmas(bundle.words, listKey.kind === 'pack' ? bundle.words : packWords))
    const fallback = bundle.words
      .filter((word) => progress.words[String(word.id)]?.userMark === 'study' || listKey.kind === 'pack')
      .slice(0, tempoSize)
    startSession(
      fromList.length ? fromList : fallback,
      listKey.kind === 'pack' ? { kind: 'pack', packId: listKey.packId } : { kind: 'world', worldId: 'home' }
    )
  }

  const runShelvesSticky = (words: NecessaryWord[]) => {
    if (shelfFilter === 'in_feed') {
      startBridge(
        words.slice(0, 3).map((word) => ({
          en: word.en,
          ru: word.ru,
          wordId: word.id,
          lemmaKey: lemmaKeyFromEn(word.en),
        }))
      )
      return
    }
    const fromFuel = lemmasToWords(fuelLemmas(words, packWords))
    startSession(fromFuel.length ? fromFuel : words.slice(0, tempoSize), { kind: 'world', worldId: 'home' })
  }

  if (view === 'session' && sessionWords.length > 0) {
    return (
      <VocabularyThinSession
        key={sessionKey}
        words={sessionWords}
        distractorPool={activeWords}
        route={sessionRoute}
        tempo={tempo}
        routeTitle={copy.spaceTitle}
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
        onExit={() => setView(sessionRoute.kind === 'phrasebook' ? 'phrasebook-list' : 'hub')}
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
      <VocabHubShell key="import" backLabel={copy.back} onBack={backToHub}>
        <VocabularyPackImportScreen
          catalog={activeWords}
          audience={audience}
          progressMap={progress.words}
          onSaved={(packId) => {
            const next = loadVocabularyProgress()
            setProgress(next)
            const pack = loadCustomWordPacks().find((item) => item.id === packId)
            const words = pack
              ? customPackToNecessaryWords(pack, { catalog: activeWords, progressMap: next.words })
              : []
            startSession(words.slice(0, tempoSize), { kind: 'pack', packId })
          }}
        />
      </VocabHubShell>
    )
  }

  if (view === 'list' && listKey) {
    const bundle = listBundle()
    return (
      <VocabHubShell
        key="list"
        backLabel={copy.back}
        onBack={backToHub}
        actionLabel={bundle.sticky}
        onAction={bundle.sticky ? () => runListSticky(bundle) : undefined}
        actionDisabled={bundle.words.length === 0}
      >
        <VocabularyListScreen
          title={bundle.title}
          audience={audience}
          words={bundle.words}
          progressMap={progress.words}
          showMarks={bundle.showMarks}
          allowSearch
          emptyText={bundle.empty}
          onStudy={(word) => persistMark(word, 'study')}
          onKnow={(word) => persistMark(word, 'know')}
        />
      </VocabHubShell>
    )
  }

  if (view === 'shelves') {
    const q = shelfQuery.trim().toLowerCase()
    const filtered = q
      ? shelvedRows.filter(
          (row) => row.word.en.toLowerCase().includes(q) || row.word.ru.toLowerCase().includes(q)
        )
      : shelvedRows
    const visible = filtered.slice(0, shelfShown)
    const shelfWords = filtered.map((row) => row.word)
    const chipItems: Array<{ id: VocabDisplayFilterId; label: string }> = [
      { id: null, label: copy.shelvesAll },
      ...VOCAB_DISPLAY_CHIP_ORDER.map((id) => ({ id, label: vocabDisplayLabel(id, audience) })),
    ]
    const chipTop = chipItems.slice(0, 3)
    const chipBottom = chipItems.slice(3)
    const pickShelfChip = (id: VocabDisplayFilterId) => {
      setShelfFilter(id)
      setShelfShown(20)
    }
    const sticky =
      shelfFilter === 'study' || shelfFilter === 'fix'
        ? copy.studyList
        : shelfFilter === 'in_feed'
          ? copy.say
          : null
    const extra =
      shelfFilter === 'in_feed' ? (
        <VocabCardFooterButton
          variant="expand"
          label={copy.handoffTranslation}
          onClick={() => handoffShelfWords(shelfWords, 'translation', false)}
          disabled={shelfWords.length === 0}
          roundBottom={false}
        />
      ) : shelfFilter === 'fix' ? (
        <div className="space-y-2">
          <VocabCardFooterButton
            variant="expand"
            label={copy.handoffTranslation}
            onClick={() => handoffShelfWords(shelfWords, 'translation', true)}
            disabled={shelfWords.length === 0 && mistakes.length === 0}
            roundBottom={false}
          />
          {onOpenCallWithHandoff ? (
            <VocabCardFooterButton
              variant="action"
              label={copy.handoffCall}
              onClick={() => handoffShelfWords(shelfWords, 'call', true)}
              disabled={shelfWords.length === 0 && mistakes.length === 0}
              roundBottom={false}
            />
          ) : null}
        </div>
      ) : null
    return (
      <VocabHubShell
        key="shelves"
        backLabel={copy.back}
        onBack={backToHub}
        actionLabel={sticky}
        onAction={sticky ? () => runShelvesSticky(shelfWords) : undefined}
        actionDisabled={shelfWords.length === 0}
      >
        <p className="text-[17px] font-semibold text-[var(--text)]">{copy.shelvesScreenTitle}</p>
        <input
          value={shelfQuery}
          onChange={(event) => {
            setShelfQuery(event.target.value)
            setShelfShown(20)
          }}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
        />
        <div className="rounded-xl border border-[var(--border)] bg-white p-2">
          <div className="grid grid-cols-3 gap-2">
            {chipTop.map((item) => (
              <ShelfFilterChip
                key={item.id ?? 'all'}
                id={item.id}
                label={item.label}
                selected={shelfFilter === item.id}
                widthClass={SHELF_CHIP_THIRD_CLASS}
                onPick={pickShelfChip}
              />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {chipBottom.map((item) => (
              <ShelfFilterChip
                key={item.id ?? 'all'}
                id={item.id}
                label={item.label}
                selected={shelfFilter === item.id}
                widthClass={SHELF_CHIP_THIRD_CLASS}
                onPick={pickShelfChip}
              />
            ))}
          </div>
        </div>
        {extra}
        <div className="space-y-2">
          {visible.map((row) => (
            <VocabShelfRow
              key={row.word.id}
              en={row.word.en}
              ru={row.word.ru}
              statusLabel={vocabShelfLabel(row.shelf, audience)}
              listenLabel={copy.listen}
            />
          ))}
          {filtered.length > shelfShown ? (
            <button
              type="button"
              className="w-full py-2 text-[14px] text-[var(--text-muted)]"
              onClick={() => setShelfShown((n) => n + 20)}
            >
              {copy.more}
            </button>
          ) : null}
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-[var(--border)] bg-white px-3 py-4 text-[14px] text-[var(--text-muted)]">
              {shelfFilter === 'mastered' ? copy.masteredEmpty : copy.emptyList}
            </p>
          ) : null}
        </div>
      </VocabHubShell>
    )
  }

  if (view === 'phrasebook') {
    return (
      <VocabHubShell key="phrasebook" backLabel={copy.back} onBack={onBackToLessons}>
        <p className="text-[17px] font-semibold text-[var(--text)]">{PHRASEBOOK_COPY.screenTitle}</p>
        <p className="text-[14px] text-[var(--text-muted)]">{PHRASEBOOK_COPY.listHint}</p>
        {PHRASEBOOK_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className="flex w-full min-h-[44px] items-center justify-between rounded-[1.15rem] border border-[var(--chat-section-neutral-border)] bg-white px-4 py-3 text-left text-[15px] font-semibold text-[var(--text)]"
            onClick={() => {
              saveActivePhrasebookTopicId(topic.id)
              setPhrasebookTopicId(topic.id)
              setView('phrasebook-list')
            }}
          >
            {topic.title}
            <span className="font-medium text-[var(--text-muted)]">›</span>
          </button>
        ))}
      </VocabHubShell>
    )
  }

  if (view === 'phrasebook-list') {
    const topic = PHRASEBOOK_TOPICS.find((item) => item.id === phrasebookTopicId) ?? PHRASEBOOK_TOPICS[0]!
    const remaining = phrasebookWords.filter((word) => progress.words[String(word.id)]?.userMark !== 'know')
    const planned = pickNextSessionWords({
      words: remaining,
      progressMap: progress.words,
      size: tempoSize,
    })
    return (
      <VocabHubShell
        key={`phrasebook-list-${topic.id}`}
        backLabel={copy.back}
        onBack={() => setView('phrasebook')}
        actionLabel={PHRASEBOOK_COPY.studyCta}
        onAction={() => startSession(planned, { kind: 'phrasebook', topicId: topic.id })}
        actionDisabled={planned.length === 0}
      >
        <VocabularyListScreen
          title={topic.title}
          audience={audience}
          words={phrasebookWords}
          progressMap={progress.words}
          showMarks
          forceShowKnow
          onStudy={(word) => persistMark(word, 'study')}
          onKnow={(word) => persistMark(word, progress.words[String(word.id)]?.userMark === 'know' ? null : 'know')}
        />
      </VocabHubShell>
    )
  }

  if (view === 'catalog') {
    const worlds = audience === 'child' ? VOCABULARY_WORLDS.filter((world) => world.id !== 'core') : VOCABULARY_WORLDS
    return (
      <VocabHubShell key="catalog" backLabel={copy.back} onBack={backToHub}>
        {worlds.map((world) => {
          const words = worldPool(world.id)
          const reviewed = countReviewed(words, progress.words)
          const plannedSprint = pickNextSessionWords({
            words,
            progressMap: progress.words,
            size: sessionSizeForTempo('sprint'),
          })
          const plannedFull = pickNextSessionWords({
            words,
            progressMap: progress.words,
            size: sessionSizeForTempo('full'),
          })
          return (
            <VocabCard
              key={world.id}
              title={`${world.badge} ${world.title}`}
              insetCta={
                <div className="grid grid-cols-2 gap-2">
                  <VocabCardFooterButton
                    placement="inset"
                    variant="expand"
                    label={copy.tempoSprintCta}
                    disabled={plannedSprint.length === 0}
                    onClick={() => startWorldTempo(world.id, 'sprint')}
                  />
                  <VocabCardFooterButton
                    placement="inset"
                    variant="launch"
                    label={copy.tempoFullCta}
                    disabled={plannedFull.length === 0}
                    onClick={() => startWorldTempo(world.id, 'full')}
                  />
                </div>
              }
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  setListKey({ kind: 'world', worldId: world.id })
                  setView('list')
                }}
              >
                <p className={VOCAB_CARD_BODY_REASON}>{world.description}</p>
                <p className={`mt-2 ${VOCAB_CARD_BODY_REASON}`}>
                  {copy.worldReviewed(reviewed, words.length)}
                </p>
              </button>
            </VocabCard>
          )
        })}
      </VocabHubShell>
    )
  }

  const packTitle = visiblePacks[0]?.title

  return (
    <VocabHubShell key="hub" backLabel={copy.back} onBack={onBackToLessons}>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {tiles.slice(0, 3).map((tile) => (
            <button key={tile.id} type="button" className={VOCAB_STATUS_TILE} onClick={() => openTile(tile.id)}>
              <p className="mt-0.5 text-[19px] font-semibold tabular-nums text-[var(--text)]">{tile.count}</p>
              <p className="leading-tight break-words text-[13px] text-[var(--text-muted)]">{vocabTileLabel(tile.id, audience)}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tiles.slice(3).map((tile) => (
            <button key={tile.id} type="button" className={VOCAB_STATUS_TILE} onClick={() => openTile(tile.id)}>
              <p className="mt-0.5 text-[19px] font-semibold tabular-nums text-[var(--text)]">{tile.count}</p>
              <p className="leading-tight break-words text-[13px] text-[var(--text-muted)]">{vocabTileLabel(tile.id, audience)}</p>
            </button>
          ))}
        </div>
        <p className="px-1 text-center text-[12px] leading-snug text-[var(--text-muted)]">{copy.pathHint}</p>
      </div>

      <VocabCard
        title={copy.nowTitle}
        insetCta={
          <VocabCardFooterButton placement="inset" variant="launch" label={nowCtaLabel} onClick={handleNow} />
        }
      >
        <p className={VOCAB_CARD_BODY_TITLE}>{nowBody.title}</p>
        <p className={VOCAB_CARD_BODY_REASON}>{nowBody.reason}</p>
      </VocabCard>

      <HubNavCard
        title={copy.shelvesTitle}
        ariaLabel={`${copy.shelvesTitle}. ${copy.catalogOpen}`}
        onClick={() => {
          resetShelvesNav()
          setView('shelves')
        }}
      >
        <p className={VOCAB_CARD_BODY_TITLE}>{String(shelvedAllCount)}</p>
        <p className={VOCAB_CARD_BODY_REASON}>{copy.shelvesBody}</p>
      </HubNavCard>

      <VocabCard
        title={copy.listsTitle}
        insetCta={
          <VocabCardFooterButton
            placement="inset"
            variant="expand"
            label={copy.fillList}
            onClick={() => setView('import')}
          />
        }
      >
        {visiblePacks.length === 0 && packs.length === 0 ? (
          <p className={VOCAB_CARD_BODY_TITLE}>{copy.listsEmpty}</p>
        ) : null}
        {visiblePacks.length === 0 && packs.length > 0 ? (
          <p className={VOCAB_CARD_BODY_TITLE}>{copy.listsDrained}</p>
        ) : null}
        {visiblePacks.length === 1 && visiblePacks[0] ? (
          <button
            type="button"
            className={`block w-full text-left ${VOCAB_CARD_BODY_TITLE}`}
            onClick={() => {
              setListKey({ kind: 'pack', packId: visiblePacks[0].id })
              setView('list')
            }}
          >
            {copy.listsFilled(packTitle ?? visiblePacks[0].title)}
          </button>
        ) : null}
        {visiblePacks.length > 1 ? (
          <div className="space-y-1">
            {visiblePacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className="block w-full text-left text-[14px] font-semibold text-[var(--text)]"
                onClick={() => {
                  setListKey({ kind: 'pack', packId: pack.id })
                  setView('list')
                }}
              >
                {pack.title}
              </button>
            ))}
          </div>
        ) : null}
      </VocabCard>

      <HubNavCard
        title={copy.catalogTitle}
        ariaLabel={`${copy.catalogTitle}. ${copy.catalogOpen}`}
        onClick={() => setView('catalog')}
      >
        <p className={VOCAB_CARD_BODY_REASON}>{copy.catalogBody}</p>
      </HubNavCard>
    </VocabHubShell>
  )
}
