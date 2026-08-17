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
import HubNavCard from '@/components/nav/HubNavCard'
import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import { customPackToNecessaryWords } from '@/lib/vocabulary/customPackAdapter'
import { isPackDrained } from '@/lib/vocabulary/resolveImportRows'
import {
  VOCAB_CARD_BODY_REASON,
  VOCAB_CARD_BODY_TITLE,
  VOCAB_PAIR_EN,
  VOCAB_PAIR_LINE,
  VOCAB_PAIR_RU,
  VOCAB_SCREEN_TITLE,
  VOCAB_SHELF_CHIP,
  VOCAB_SHELF_CHIP_ACTIVE,
} from '@/lib/vocabulary/cardStyles'
import {
  loadPackWords,
  pauseSessionWords,
  pickVocabFuel,
  rankVocabNowCta,
  type VocabNowKind,
} from '@/lib/vocabulary/fuel'
import { hubDisplayTiles, listByDisplayFilter, uniqueWords, type VocabDisplayFilterId } from '@/lib/vocabulary/hubBuckets'
import { isWordInProgress } from '@/lib/vocabulary/learned'
import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
  patchWordProgress,
  rememberLastVocabRoute,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { writeVocabTranslationHandoff } from '@/lib/vocabulary/translationHandoff'
import { lemmaKeyFromEn, listByFeedStatus, setUserMark } from '@/lib/vocabulary/wordFeed'
import { wordsForNowCta } from '@/lib/vocabulary/nowCtaWords'
import {
  formatVocabFocusPairs,
  HUB_QUICK_START_SIZE,
  poolForHubQuickStart,
  resolveHubQuickStartRoute,
  wordsForHubQuickStart,
} from '@/lib/vocabulary/hubQuickStart'
import { formatHandoffLemmaLine, vocabHubCopy, vocabHubFooter, vocabNowBody, vocabDisplayLabel, vocabShelfChipLabel, vocabShelfLabel, VOCAB_DISPLAY_CHIP_ORDER } from '@/lib/uiCopy/vocabularyHub'
import { PHRASEBOOK_COPY } from '@/lib/uiCopy/phrasebook'
import { loadActivePhrasebookTopicId, saveActivePhrasebookTopicId } from '@/lib/phrasebook/activeTopic'
import { PHRASEBOOK_TOPICS, isPhrasebookTopicId, type PhrasebookTopicId } from '@/lib/phrasebook/topics'
import { resolvePhrasebookWords } from '@/lib/phrasebook/toNecessaryWords'
import { createEmptyWordProgress, pickNextSessionWords, VOCAB_CYCLE_SIZE } from '@/lib/vocabulary/srs'
import { formatVocabularySessionRouteTitle } from '@/lib/vocabulary/sessionRoute'
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

type HubView =
  | 'hub'
  | 'catalog'
  | 'list'
  | 'import'
  | 'session'
  | 'bridge'
  | 'shelves'
  | 'phrasebook'
  | 'phrasebook-list'
  | 'packs'
  | 'worlds'
  | 'stats'

function ShelfFilterChip({
  id,
  label,
  count,
  selected,
  onPick,
}: {
  id: VocabDisplayFilterId
  label: string
  count: number
  selected: boolean
  onPick: (id: VocabDisplayFilterId) => void
}) {
  const text = vocabShelfChipLabel(label, count)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={text}
      className={`${VOCAB_SHELF_CHIP} min-w-[6.5rem] flex-1 ${selected ? VOCAB_SHELF_CHIP_ACTIVE : ''}`}
      onClick={() => onPick(id)}
    >
      {text}
    </button>
  )
}

function countReviewed(words: NecessaryWord[], map: VocabularyProgressState['words']): number {
  return words.filter((word) => isWordInProgress(map[String(word.id)])).length
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
  onOpenPracticeTopic?: (topic: string) => void
  onOpenMyPlan?: () => void
  initialView?: 'hub' | 'phrasebook' | 'feed'
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
  const [view, setView] = React.useState<HubView>(() => {
    if (initialView === 'phrasebook') return 'phrasebook'
    if (initialView === 'feed') return 'shelves'
    return 'hub'
  })
  const [phrasebookTopicId, setPhrasebookTopicId] = React.useState<PhrasebookTopicId>(loadActivePhrasebookTopicId)
  const [listKey, setListKey] = React.useState<ListKey | null>(null)
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [sessionWords, setSessionWords] = React.useState<NecessaryWord[]>([])
  const [sessionRoute, setSessionRoute] = React.useState<VocabularySessionRoute>({ kind: 'world', worldId: 'home' })
  const [sessionKey, setSessionKey] = React.useState(0)
  const [bridgeLemmas, setBridgeLemmas] = React.useState<VocabularyFocusLemma[]>([])
  const [nowKind, setNowKind] = React.useState<VocabNowKind>('empty')
  const [shelfFilter, setShelfFilter] = React.useState<VocabDisplayFilterId>(
    initialView === 'feed' ? 'in_feed' : null
  )
  const [shelfQuery, setShelfQuery] = React.useState('')
  const [shelfShown, setShelfShown] = React.useState(20)
  const [listsOrigin, setListsOrigin] = React.useState<'hub' | 'catalog'>('hub')

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
  const shelfTileCounts = React.useMemo(() => {
    const tiles = hubDisplayTiles({
      audience,
      words: poolWords,
      progressMap: progress.words,
      mistakes,
    })
    return new Map(tiles.map((tile) => [tile.id, tile.count]))
  }, [audience, mistakes, poolWords, progress.words])

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
    const footer = vocabHubFooter(nowKind, audience)
    onFooterViewChange?.({
      dynamicText:
        view === 'hub'
          ? copy.hubFooterDynamic
          : view === 'shelves'
          ? copy.shelvesFooterDynamic
          : view === 'worlds'
            ? copy.worldsFooterDynamic
            : footer.dynamicText,
      staticText:
        view === 'hub'
          ? copy.spaceTitle
          : view === 'worlds'
            ? copy.worldsTitle
            : view === 'catalog' || view === 'packs'
              ? copy.catalogScreenTitle
              : view === 'stats'
                ? copy.statsTitle
                : view === 'shelves'
                  ? copy.shelvesFooterStatic
                  : footer.staticText,
      typingKey: `vocab-hub-${nowKind}-${view}`,
    })
    return () => onFooterViewChange?.(null)
  }, [
    audience,
    copy.catalogScreenTitle,
    copy.hubFooterDynamic,
    copy.shelvesFooterDynamic,
    copy.shelvesFooterStatic,
    copy.spaceTitle,
    copy.statsTitle,
    copy.worldsFooterDynamic,
    copy.worldsTitle,
    nowKind,
    onFooterViewChange,
    view,
  ])

  const nowBody = vocabNowBody(nowKind, audience)

  const worldPool = (worldId: VocabularyWorldId) =>
    activeWords.filter((word) => word.primaryWorld === worldId)

  const fuelLemmas = (words: NecessaryWord[] = activeWords, extraPack: NecessaryWord[] = packWords) =>
    pickVocabFuel({
      words,
      progressMap: progress.words,
      packWords: extraPack,
      phrasebookWords,
      n: VOCAB_CYCLE_SIZE,
      mistakeLemmaKeys: new Set(mistakes.map((item) => item.lemmaKey)),
    })

  const lemmasToWords = (lemmas: VocabularyFocusLemma[]) => {
    const pool = [...activeWords, ...packWords, ...phrasebookWords]
    return lemmas
      .map((lemma) => pool.find((word) => word.id === lemma.wordId || lemmaKeyFromEn(word.en) === lemma.lemmaKey))
      .filter((word): word is NecessaryWord => Boolean(word))
  }

  const inFeedHandoffWords = listByFeedStatus(poolWords, progress.words, 'in_feed').slice(0, 3)
  const nowCtaWords = wordsForNowCta(nowKind, {
    fuel: lemmasToWords(fuelLemmas()),
    inFeed: inFeedHandoffWords,
    pause: pauseSessionWords({ words: activeWords, progressMap: progress.words, n: 2 }),
  })

  const hubQuickStartRoute = resolveHubQuickStartRoute(progress.lastSessionRoute)
  const hubQuickStartPool = poolForHubQuickStart(hubQuickStartRoute, {
    catalog: activeWords,
    packWordsForId: (packId) => {
      const pack = packs.find((item) => item.id === packId)
      return pack ? customPackToNecessaryWords(pack, { catalog: activeWords, progressMap: progress.words }) : []
    },
    phrasebookWordsForId: (topicId) =>
      isPhrasebookTopicId(topicId) ? resolvePhrasebookWords(topicId, activeWords) : [],
  })
  const hubQuickStartWords = wordsForHubQuickStart({
    pool: hubQuickStartPool,
    progressMap: progress.words,
  })
  const hubFocusPairs = formatVocabFocusPairs(hubQuickStartWords)
  const hubListTitle =
    hubQuickStartRoute.kind === 'pack'
      ? packs.find((item) => item.id === hubQuickStartRoute.packId)?.title ??
        formatVocabularySessionRouteTitle(hubQuickStartRoute)
      : formatVocabularySessionRouteTitle(hubQuickStartRoute)
  const hubQuickStartEmpty = hubQuickStartWords.length === 0

  const pickWorldWords = (worldId: VocabularyWorldId) =>
    pickNextSessionWords({
      words: worldPool(worldId),
      progressMap: progress.words,
      size: VOCAB_CYCLE_SIZE,
    })

  const startSession = (words: NecessaryWord[], route: VocabularySessionRoute, size = VOCAB_CYCLE_SIZE) => {
    if (words.length === 0) {
      setListKey({ kind: 'vitrine' })
      setView('list')
      return
    }
    const titled =
      route.kind === 'pack'
        ? packs.find((item) => item.id === route.packId)?.title ?? formatVocabularySessionRouteTitle(route)
        : formatVocabularySessionRouteTitle(route)
    setProgress((prev) => {
      const next = rememberLastVocabRoute(prev, route, titled)
      saveVocabularyProgress(next)
      return next
    })
    setSessionWords(words.slice(0, size))
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
      const words = pack ? customPackToNecessaryWords(pack, { catalog: activeWords, progressMap: progress.words }) : []
      const fromFuel = lemmasToWords(fuelLemmas(words, words))
      startSession(fromFuel.length ? fromFuel : words.slice(0, VOCAB_CYCLE_SIZE), sessionRoute)
      return
    }
    if (sessionRoute.kind === 'phrasebook' && isPhrasebookTopicId(sessionRoute.topicId)) {
      const pool = resolvePhrasebookWords(sessionRoute.topicId, activeWords).filter(
        (word) => progress.words[String(word.id)]?.userMark !== 'know'
      )
      startSession(
        pickNextSessionWords({ words: pool, progressMap: progress.words, size: VOCAB_CYCLE_SIZE }),
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
      setView('catalog')
      return
    }
    const last = progress.lastSessionRoute
    if (last?.kind === 'pack' && (nowKind === 'pause' || nowKind === 'fresh-sprint')) {
      const pack = packs.find((item) => item.id === last.packId)
      if (pack) {
        const words = customPackToNecessaryWords(pack, { catalog: activeWords, progressMap: progress.words })
        startSession(words.slice(0, VOCAB_CYCLE_SIZE), last)
        return
      }
    }
    if (nowBody.cta === 'say') {
      startBridge(
        nowCtaWords.map((word) => ({
          en: word.en,
          ru: word.ru,
          wordId: word.id,
          lemmaKey: lemmaKeyFromEn(word.en),
        }))
      )
      return
    }
    startSession(nowCtaWords, last ?? { kind: 'world', worldId: 'home' })
  }

  const handleHubQuickStart = () => {
    if (hubQuickStartEmpty) {
      setView('catalog')
      return
    }
    startSession(hubQuickStartWords, hubQuickStartRoute, HUB_QUICK_START_SIZE)
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

  const openStatuses = (id: VocabDisplayFilterId = 'fix') => {
    setShelfFilter(id)
    setShelfQuery('')
    setShelfShown(20)
    setView('shelves')
  }

  const backToHub = () => {
    setView('hub')
    setListKey(null)
    setListsOrigin('hub')
    resetShelvesNav()
  }

  const openMyLists = (origin: 'hub' | 'catalog') => {
    setListsOrigin(origin)
    setView(packs.length === 0 ? 'import' : 'packs')
  }

  const backFromLists = () => {
    if (listsOrigin === 'catalog') {
      setView('catalog')
      return
    }
    backToHub()
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

  const shelfHandoffLemmas = (words: NecessaryWord[], allowInboxFallback: boolean): VocabularyFocusLemma[] => {
    const picked = words.slice(0, 3)
    if (picked.length > 0) {
      return picked.map((word) => ({
        en: word.en,
        ru: word.ru,
        wordId: word.id,
        lemmaKey: lemmaKeyFromEn(word.en),
      }))
    }
    if (!allowInboxFallback) return []
    return mistakes.slice(0, 3).map((item) => ({
      en: item.en,
      ru: item.ru ?? '',
      lemmaKey: item.lemmaKey,
    }))
  }

  const handoffShelfWords = (
    words: NecessaryWord[],
    open: 'translation' | 'call',
    allowInboxFallback: boolean
  ) => {
    const lemmas = shelfHandoffLemmas(words, allowInboxFallback)
    if (lemmas.length === 0) return
    writeVocabTranslationHandoff({
      lemmas,
      source: 'feed_browse',
      loadStudying: open !== 'translation',
    })
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
      .slice(0, VOCAB_CYCLE_SIZE)
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
    startSession(fromFuel.length ? fromFuel : words.slice(0, VOCAB_CYCLE_SIZE), { kind: 'world', worldId: 'home' })
  }

  const openHomeTranslation = () => {
    if (inFeedHandoffWords.length === 0) return
    writeVocabTranslationHandoff({
      lemmas: inFeedHandoffWords.map((word) => ({
        en: word.en,
        ru: word.ru,
        wordId: word.id,
        lemmaKey: lemmaKeyFromEn(word.en),
      })),
      source: 'feed_browse',
      loadStudying: false,
    })
    onOpenTranslationWithHandoff?.()
  }

  if (view === 'session' && sessionWords.length > 0) {
    return (
      <VocabularyThinSession
        key={sessionKey}
        words={sessionWords}
        distractorPool={activeWords}
        route={sessionRoute}
        tempo="sprint"
        routeTitle={copy.spaceTitle}
        audience={audience}
        setProgress={setProgress}
        onFooterViewChange={onFooterViewChange}
        onSessionActiveChange={onSessionActiveChange}
        onHandoffTranslation={() => onOpenTranslationWithHandoff?.()}
        onAgain={startAgain}
        onExit={() => {
          if (sessionRoute.kind === 'phrasebook') {
            setView('phrasebook-list')
            return
          }
          if (sessionRoute.kind === 'world') {
            setListKey({ kind: 'world', worldId: sessionRoute.worldId })
            setView('list')
            return
          }
          if (sessionRoute.kind === 'pack') {
            setListKey({ kind: 'pack', packId: sessionRoute.packId })
            setView('list')
            return
          }
          setView('hub')
        }}
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
      <VocabHubShell key="import" backLabel={copy.back} onBack={backFromLists}>
        <VocabularyPackImportScreen
          catalog={activeWords}
          audience={audience}
          progressMap={progress.words}
          onSaved={(packId) => {
            const next = loadVocabularyProgress()
            setProgress(next)
            setListKey({ kind: 'pack', packId })
            setView('list')
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
        onBack={() => {
          if (listKey.kind === 'pack') {
            setListKey(null)
            setView('packs')
            return
          }
          if (listKey.kind === 'world') {
            setListKey(null)
            setView('worlds')
            return
          }
          backToHub()
        }}
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
    const chipItems: Array<{ id: VocabDisplayFilterId; label: string; count: number }> = [
      { id: null, label: copy.shelvesAll, count: shelvedAllCount },
      ...VOCAB_DISPLAY_CHIP_ORDER.map((id) => ({
        id,
        label: vocabDisplayLabel(id, audience),
        count: shelfTileCounts.get(id) ?? 0,
      })),
    ]
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
    const inFeedShelfDetail = formatHandoffLemmaLine(
      shelfHandoffLemmas(shelfWords, false).map((lemma) => lemma.en)
    )
    const fixShelfDetail = formatHandoffLemmaLine(
      shelfHandoffLemmas(shelfWords, true).map((lemma) => lemma.en)
    )
    const extra =
      shelfFilter === 'in_feed' ? (
        <VocabCardFooterButton
          variant="expand"
          label={copy.handoffTranslation}
          detail={inFeedShelfDetail || undefined}
          onClick={() => handoffShelfWords(shelfWords, 'translation', false)}
          disabled={shelfWords.length === 0}
          roundBottom={false}
        />
      ) : shelfFilter === 'fix' ? (
        <div className="space-y-2">
          <VocabCardFooterButton
            variant="expand"
            label={copy.handoffTranslation}
            detail={fixShelfDetail || undefined}
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
        <p className={VOCAB_SCREEN_TITLE}>{copy.shelvesScreenTitle}</p>
        <input
          value={shelfQuery}
          onChange={(event) => {
            setShelfQuery(event.target.value)
            setShelfShown(20)
          }}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
        />
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-white px-1.5 py-1.5">
          {chipItems.map((item) => (
            <ShelfFilterChip
              key={item.id ?? 'all'}
              id={item.id}
              label={item.label}
              count={item.count}
              selected={shelfFilter === item.id}
              onPick={pickShelfChip}
            />
          ))}
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
      <VocabHubShell
        key="phrasebook"
        backLabel={copy.back}
        onBack={initialView === 'phrasebook' ? onBackToLessons : () => setView('catalog')}
      >
        <p className={VOCAB_SCREEN_TITLE}>{PHRASEBOOK_COPY.screenTitle}</p>
        {PHRASEBOOK_TOPICS.map((topic) => (
          <HubNavCard
            key={topic.id}
            title={topic.title}
            ariaLabel={`${topic.title}. ${copy.catalogOpen}`}
            onClick={() => {
              saveActivePhrasebookTopicId(topic.id)
              setPhrasebookTopicId(topic.id)
              setView('phrasebook-list')
            }}
          />
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
      size: VOCAB_CYCLE_SIZE,
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
          onStudy={(word) => persistMark(word, 'study')}
          onKnow={(word) => persistMark(word, progress.words[String(word.id)]?.userMark === 'know' ? null : 'know')}
        />
      </VocabHubShell>
    )
  }

  if (view === 'catalog') {
    return (
      <VocabHubShell key="catalog" backLabel={copy.back} onBack={backToHub}>
        <p className={VOCAB_SCREEN_TITLE}>{copy.catalogScreenTitle}</p>
        <HubNavCard
          title={PHRASEBOOK_COPY.screenTitle}
          ariaLabel={`${PHRASEBOOK_COPY.screenTitle}. ${copy.catalogOpen}`}
          onClick={() => setView('phrasebook')}
        >
          <p className={VOCAB_CARD_BODY_REASON}>{copy.catalogPhrasebookBody}</p>
        </HubNavCard>
        <HubNavCard
          title={copy.worldsTitle}
          ariaLabel={`${copy.worldsTitle}. ${copy.catalogOpen}`}
          onClick={() => setView('worlds')}
        >
          <p className={VOCAB_CARD_BODY_REASON}>{copy.catalogWorldsBody}</p>
        </HubNavCard>
        <HubNavCard
          title={copy.listsTitle}
          ariaLabel={`${copy.listsTitle}. ${copy.catalogOpen}`}
          onClick={() => openMyLists('catalog')}
        >
          <p className={VOCAB_CARD_BODY_REASON}>{copy.catalogPacksBody}</p>
        </HubNavCard>
      </VocabHubShell>
    )
  }

  if (view === 'worlds') {
    const worlds = audience === 'child' ? VOCABULARY_WORLDS.filter((world) => world.id !== 'core') : VOCABULARY_WORLDS
    return (
      <VocabHubShell key="worlds" backLabel={copy.back} onBack={() => setView('catalog')}>
        <p className={VOCAB_SCREEN_TITLE}>{copy.worldsTitle}</p>
        {worlds.map((world) => {
          const words = worldPool(world.id)
          const reviewed = countReviewed(words, progress.words)
          return (
            <HubNavCard
              key={world.id}
              title={`${world.badge} ${world.title}`}
              ariaLabel={`${world.title}. ${copy.catalogOpen}`}
              onClick={() => {
                setListKey({ kind: 'world', worldId: world.id })
                setView('list')
              }}
            >
              <p className={VOCAB_CARD_BODY_REASON}>{world.description}</p>
              <p className={VOCAB_CARD_BODY_REASON}>{copy.worldReviewed(reviewed, words.length)}</p>
            </HubNavCard>
          )
        })}
      </VocabHubShell>
    )
  }

  if (view === 'packs') {
    return (
      <VocabHubShell key="packs" backLabel={copy.back} onBack={backFromLists}>
        <p className={VOCAB_SCREEN_TITLE}>{copy.listsTitle}</p>
        {visiblePacks.length === 0 && packs.length === 0 ? (
          <p className={VOCAB_CARD_BODY_REASON}>{copy.listsEmpty}</p>
        ) : null}
        {visiblePacks.length === 0 && packs.length > 0 ? (
          <p className={VOCAB_CARD_BODY_REASON}>{copy.listsDrained}</p>
        ) : null}
        {visiblePacks.map((pack) => (
          <HubNavCard
            key={pack.id}
            title={pack.title}
            ariaLabel={`${pack.title}. ${copy.catalogOpen}`}
            onClick={() => {
              setListKey({ kind: 'pack', packId: pack.id })
              setView('list')
            }}
          />
        ))}
        <VocabCardFooterButton variant="expand" label={copy.fillList} onClick={() => setView('import')} />
      </VocabHubShell>
    )
  }

  if (view === 'stats') {
    const history = progress.history.slice(0, 5)
    return (
      <VocabHubShell key="stats" backLabel={copy.back} onBack={backToHub}>
        <p className={VOCAB_SCREEN_TITLE}>{copy.statsTitle}</p>
        <p className={VOCAB_CARD_BODY_REASON}>{`Сессии: ${progress.stats.completedSessions}`}</p>
        {history.length === 0 ? (
          <p className={VOCAB_CARD_BODY_REASON}>{copy.statsEmpty}</p>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full rounded-[1.15rem] border border-[var(--chat-section-neutral-border)] bg-white px-4 py-3 text-left"
              onClick={() => {
                if (item.route.kind === 'pack') {
                  setListKey({ kind: 'pack', packId: item.route.packId })
                  setView('list')
                  return
                }
                if (mistakes.length > 0) {
                  openStatuses('fix')
                  return
                }
                handleNow()
              }}
            >
              <p className={VOCAB_CARD_BODY_TITLE}>{formatVocabularySessionRouteTitle(item.route)}</p>
              <p className={VOCAB_CARD_BODY_REASON}>{new Date(item.completedAt).toLocaleDateString()}</p>
            </button>
          ))
        )}
        {mistakes.length > 0 ? (
          <VocabCardFooterButton variant="launch" label={copy.shelfFix} onClick={() => openStatuses('fix')} />
        ) : null}
      </VocabHubShell>
    )
  }

  const inFeedHandoffPairs = formatVocabFocusPairs(inFeedHandoffWords)
  const inFeedHandoffDetail = formatHandoffLemmaLine(inFeedHandoffWords.map((word) => word.en))

  return (
    <VocabHubShell key="hub" backLabel={copy.back} onBack={onBackToLessons}>
      <VocabCard
        title={copy.nowTitle}
        insetCta={
          <VocabCardFooterButton placement="inset" variant="launch" label={copy.start} onClick={handleHubQuickStart} />
        }
      >
        {hubQuickStartEmpty ? (
          <p className={VOCAB_CARD_BODY_REASON}>{copy.hubEmptyReason}</p>
        ) : (
          <>
            <p className={VOCAB_CARD_BODY_TITLE}>{copy.resumePack(hubListTitle)}</p>
            {hubFocusPairs.length > 0 ? (
              <div className="space-y-1">
                {hubFocusPairs.map((pair) => (
                  <p key={pair.id} className={VOCAB_PAIR_LINE}>
                    <span className={VOCAB_PAIR_EN}>{pair.en}</span>
                    {pair.ru ? (
                      <>
                        {' — '}
                        <span className={VOCAB_PAIR_RU}>{pair.ru}</span>
                      </>
                    ) : null}
                  </p>
                ))}
              </div>
            ) : null}
          </>
        )}
      </VocabCard>

      {inFeedHandoffWords.length > 0 ? (
        <VocabCard
          title={copy.inFeedTitle}
          insetCta={
            <VocabCardFooterButton
              placement="inset"
              variant="expand"
              label={copy.handoffTranslation}
              detail={inFeedHandoffDetail || undefined}
              onClick={openHomeTranslation}
            />
          }
        >
          <div className="space-y-1">
            {inFeedHandoffPairs.map((pair) => (
              <p key={pair.id} className={VOCAB_PAIR_LINE}>
                <span className={VOCAB_PAIR_EN}>{pair.en}</span>
                {pair.ru ? (
                  <>
                    {' — '}
                    <span className={VOCAB_PAIR_RU}>{pair.ru}</span>
                  </>
                ) : null}
              </p>
            ))}
          </div>
        </VocabCard>
      ) : null}

      <HubNavCard
        title={copy.addWordsTitle}
        ariaLabel={`${copy.addWordsTitle}. ${copy.catalogOpen}`}
        onClick={() => openMyLists('hub')}
      >
        {visiblePacks.length > 0 ? (
          <p className={VOCAB_CARD_BODY_REASON}>{visiblePacks.map((pack) => pack.title).join(' · ')}</p>
        ) : null}
      </HubNavCard>

      <HubNavCard
        title={copy.catalogTitle}
        ariaLabel={`${copy.catalogTitle}. ${copy.catalogOpen}`}
        onClick={() => setView('catalog')}
      />

      <HubNavCard
        title={copy.shelvesTitle}
        ariaLabel={`${copy.shelvesTitle}. ${copy.catalogOpen}`}
        onClick={() => {
          resetShelvesNav()
          setView('shelves')
        }}
      >
        <p className={VOCAB_CARD_BODY_TITLE}>{String(shelvedAllCount)}</p>
      </HubNavCard>

      <HubNavCard
        title={copy.statsTitle}
        ariaLabel={copy.statsTitle}
        onClick={() => setView('stats')}
      >
        <p className={VOCAB_CARD_BODY_REASON}>{`Сессии: ${progress.stats.completedSessions}`}</p>
      </HubNavCard>
    </VocabHubShell>
  )
}
