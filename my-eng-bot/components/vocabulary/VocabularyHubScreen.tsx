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
import {
  VOCAB_CARD_BODY_REASON,
  VOCAB_CARD_BODY_TITLE,
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
  hubTiles,
  listShelvedWords,
  listStudyWords,
  resolveMistakeWords,
  shelfIdsForAudience,
  uniqueWords,
  type HubTileId,
  type VocabShelfId,
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
import { vocabHubCopy, vocabHubFooter, vocabNowBody, vocabShelfLabel, vocabTileLabel, VOCAB_SHELF_CHIP_ORDER } from '@/lib/uiCopy/vocabularyHub'
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

type HubView = 'hub' | 'catalog' | 'list' | 'import' | 'session' | 'bridge' | 'shelves'

/** Equal chip width: one quarter of the row minus three `gap-2` gutters. */
const SHELF_CHIP_QUARTER_CLASS = 'w-[calc((100%-1.5rem)/4)] shrink-0'

function ShelfFilterChip({
  id,
  label,
  selected,
  widthClass,
  onPick,
}: {
  id: VocabShelfId | null
  label: string
  selected: boolean
  widthClass: string
  onPick: (id: VocabShelfId | null) => void
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

type ListKey =
  | { kind: 'world'; worldId: VocabularyWorldId }
  | { kind: 'errors' }
  | { kind: 'pack'; packId: string }
  | { kind: 'vitrine' }
  | { kind: 'mastered' }
  | { kind: 'bank' }
  | { kind: 'study' }

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
  const [shelfFilter, setShelfFilter] = React.useState<VocabShelfId | null>(null)
  const [shelfQuery, setShelfQuery] = React.useState('')
  const [shelfShown, setShelfShown] = React.useState(20)

  const activeWords = React.useMemo(
    () => (catalog?.words ?? []).filter((word) => word.status === 'active'),
    [catalog]
  )
  const packWords = React.useMemo(() => loadPackWords(), [progress, view])
  const packs = React.useMemo(() => loadCustomWordPacks(), [progress, view])
  const mistakes = React.useMemo(() => loadVocabMistakes(), [progress, view])
  const poolWords = React.useMemo(() => uniqueWords([...activeWords, ...packWords]), [activeWords, packWords])
  const shelvedRows = React.useMemo(
    () =>
      listShelvedWords({
        words: poolWords,
        progressMap: progress.words,
        mistakes,
        audience,
        shelf: shelfFilter,
      }),
    [audience, mistakes, poolWords, progress.words, shelfFilter]
  )
  const shelvedAllCount = React.useMemo(
    () =>
      listShelvedWords({
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
      setView('hub')
      setSessionWords([])
      resetShelvesNav()
    })
    return () => onRegisterLeaveHandler?.(null)
  }, [onRegisterLeaveHandler, resetShelvesNav])

  React.useEffect(() => {
    if (exitRequestKey <= 0) return
    setView('hub')
    setSessionWords([])
    resetShelvesNav()
  }, [exitRequestKey, resetShelvesNav])

  React.useEffect(() => {
    if (view === 'session' || view === 'bridge') return
    const footer = vocabHubFooter(nowKind)
    onFooterViewChange?.({
      dynamicText: view === 'shelves' ? copy.shelvesFooterDynamic : footer.dynamicText,
      staticText:
        view === 'catalog' ? copy.catalogScreenTitle : view === 'shelves' ? copy.shelvesFooterStatic : footer.staticText,
      typingKey: `vocab-hub-${nowKind}-${view}`,
    })
    return () => onFooterViewChange?.(null)
  }, [audience, copy.catalogScreenTitle, copy.shelvesFooterDynamic, copy.shelvesFooterStatic, nowKind, onFooterViewChange, view])

  const tiles = hubTiles({
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
      n: tempoSize,
      mistakeLemmaKeys: new Set(mistakes.map((item) => item.lemmaKey)),
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
    if (id === 'mastered') setListKey({ kind: 'mastered' })
    else if (id === 'in_feed') setListKey({ kind: 'bank' })
    else if (id === 'study') setListKey({ kind: 'study' })
    else setListKey({ kind: 'errors' })
    setView('list')
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
        words: pack ? customPackToNecessaryWords(pack) : [],
        showMarks: true,
        sticky: copy.studyList,
        empty: copy.emptyList,
      }
    }
    if (listKey.kind === 'mastered') {
      return {
        title: copy.masteredTitle,
        words: listByFeedStatus(poolWords, progress.words, 'mastered'),
        showMarks: false,
        sticky: null,
        empty: copy.masteredEmpty,
      }
    }
    if (listKey.kind === 'bank') {
      return {
        title: copy.bankTitle,
        words: listByFeedStatus(poolWords, progress.words, 'in_feed'),
        showMarks: false,
        sticky: copy.say,
        empty: copy.emptyList,
      }
    }
    if (listKey.kind === 'study') {
      return {
        title: copy.studyTitle,
        words: listStudyWords(poolWords, progress.words),
        showMarks: true,
        sticky: copy.studyList,
        empty: copy.emptyList,
      }
    }
    return {
      title: copy.errorsTitle,
      words: resolveMistakeWords(activeWords, packWords, progress.words, mistakes),
      showMarks: true,
      sticky: copy.say,
      empty: copy.emptyList,
    }
  }

  const handoffBank = () => {
    const bank = listByFeedStatus(poolWords, progress.words, 'in_feed').slice(0, 3)
    if (bank.length === 0) return
    writeVocabTranslationHandoff({
      lemmas: bank.map((word) => ({
        en: word.en,
        ru: word.ru,
        wordId: word.id,
        lemmaKey: lemmaKeyFromEn(word.en),
      })),
      source: 'feed_browse',
      loadStudying: true,
    })
    onOpenTranslationWithHandoff?.()
  }

  const handoffErrors = (open: 'translation' | 'call') => {
    const errorWords = resolveMistakeWords(activeWords, packWords, progress.words, mistakes).slice(0, 3)
    const lemmas =
      errorWords.length > 0
        ? errorWords.map((word) => ({
            en: word.en,
            ru: word.ru,
            wordId: word.id,
            lemmaKey: lemmaKeyFromEn(word.en),
          }))
        : mistakes.slice(0, 3).map((item) => ({
            en: item.en,
            ru: item.ru ?? '',
            lemmaKey: item.lemmaKey,
          }))
    if (lemmas.length === 0) return
    writeVocabTranslationHandoff({ lemmas, source: 'feed_browse', loadStudying: true })
    if (open === 'call') onOpenCallWithHandoff?.()
    else     onOpenTranslationWithHandoff?.()
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
    if (listKey.kind === 'bank' || (listKey.kind === 'errors' && nowKind === 'errors-bridge')) {
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
    const fromList = lemmasToWords(fuelLemmas(bundle.words, listKey.kind === 'pack' ? bundle.words : packWords))
    const fallback = bundle.words
      .filter((word) => {
        const mark = progress.words[String(word.id)]?.userMark
        return mark === 'study' || listKey.kind === 'pack' || listKey.kind === 'errors' || listKey.kind === 'study'
      })
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
      <VocabHubShell backLabel={copy.back} onBack={backToHub}>
        <VocabularyPackImportScreen catalog={activeWords} audience={audience} onSaved={backToHub} />
      </VocabHubShell>
    )
  }

  if (view === 'list' && listKey) {
    const bundle = listBundle()
    const extra =
      listKey.kind === 'bank' ? (
        <VocabCardFooterButton
          variant="expand"
          label={copy.handoffTranslation}
          onClick={handoffBank}
          disabled={bundle.words.length === 0}
          roundBottom={false}
        />
      ) : listKey.kind === 'errors' ? (
        <div className="space-y-2">
          <VocabCardFooterButton
            variant="expand"
            label={copy.handoffTranslation}
            onClick={() => handoffErrors('translation')}
            disabled={bundle.words.length === 0 && mistakes.length === 0}
            roundBottom={false}
          />
          {onOpenCallWithHandoff ? (
            <VocabCardFooterButton
              variant="action"
              label={copy.handoffCall}
              onClick={() => handoffErrors('call')}
              disabled={bundle.words.length === 0 && mistakes.length === 0}
              roundBottom={false}
            />
          ) : null}
        </div>
      ) : null
    return (
      <VocabHubShell
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
          extra={extra}
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
    const chips = VOCAB_SHELF_CHIP_ORDER.filter((id) => shelfIdsForAudience(audience).includes(id))
    const chipItems: Array<{ id: VocabShelfId | null; label: string }> = [
      { id: null, label: copy.shelvesAll },
      ...chips.map((id) => ({ id, label: vocabShelfLabel(id, audience) })),
    ]
    const topCount = chipItems.length === 7 ? 4 : 3
    const chipTop = chipItems.slice(0, topCount)
    const chipBottom = chipItems.slice(topCount)
    const pickShelfChip = (id: VocabShelfId | null) => {
      setShelfFilter(id)
      setShelfShown(20)
    }
    const sticky =
      shelfFilter === 'study' || shelfFilter === 'returned'
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
      ) : shelfFilter === 'errors' ? (
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
          {chipItems.length === 7 ? (
            <div className="grid grid-cols-4 gap-2">
              {chipTop.map((item) => (
                <ShelfFilterChip
                  key={item.id ?? 'all'}
                  id={item.id}
                  label={item.label}
                  selected={shelfFilter === item.id}
                  widthClass="w-full"
                  onPick={pickShelfChip}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center gap-2">
              {chipTop.map((item) => (
                <ShelfFilterChip
                  key={item.id ?? 'all'}
                  id={item.id}
                  label={item.label}
                  selected={shelfFilter === item.id}
                  widthClass={SHELF_CHIP_QUARTER_CLASS}
                  onPick={pickShelfChip}
                />
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-center gap-2">
            {chipBottom.map((item) => (
              <ShelfFilterChip
                key={item.id ?? 'all'}
                id={item.id}
                label={item.label}
                selected={shelfFilter === item.id}
                widthClass={item.id === 'returned' ? 'w-fit shrink-0' : SHELF_CHIP_QUARTER_CLASS}
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
              {copy.emptyList}
            </p>
          ) : null}
        </div>
      </VocabHubShell>
    )
  }

  if (view === 'catalog') {
    const worlds = audience === 'child' ? VOCABULARY_WORLDS.filter((world) => world.id !== 'core') : VOCABULARY_WORLDS
    return (
      <VocabHubShell backLabel={copy.back} onBack={backToHub}>
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
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <VocabCardFooterButton
                    placement="inset"
                    variant="expand"
                    flushTop
                    label={copy.tempoSprintCta}
                    disabled={plannedSprint.length === 0}
                    onClick={() => startWorldTempo(world.id, 'sprint')}
                  />
                  <VocabCardFooterButton
                    placement="inset"
                    variant="launch"
                    flushTop
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
        {audience === 'adult' && onOpenByLevel ? (
          <button
            type="button"
            className="flex w-full min-h-[44px] items-center justify-between rounded-[1.15rem] border border-[var(--chat-section-neutral-border)] bg-white px-4 py-3 text-left text-[15px] text-[var(--text-muted)]"
            onClick={onOpenByLevel}
          >
            {copy.byLevel}
            <span>›</span>
          </button>
        ) : null}
      </VocabHubShell>
    )
  }

  const packTitle = packs[0]?.title

  return (
    <VocabHubShell backLabel={copy.back} onBack={onBackToLessons}>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <button key={tile.id} type="button" className={VOCAB_STATUS_TILE} onClick={() => openTile(tile.id)}>
            <p className="mt-0.5 text-[19px] font-semibold tabular-nums text-[var(--text)]">{tile.count}</p>
            <p className="text-[13px] text-[var(--text-muted)]">{vocabTileLabel(tile.id, audience)}</p>
          </button>
        ))}
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

      <VocabCard
        title={copy.shelvesTitle}
        insetCta={
          <VocabCardFooterButton
            placement="inset"
            variant="expand"
            label={copy.catalogOpen}
            onClick={() => {
              resetShelvesNav()
              setView('shelves')
            }}
          />
        }
      >
        <p className={VOCAB_CARD_BODY_TITLE}>{String(shelvedAllCount)}</p>
        <p className={VOCAB_CARD_BODY_REASON}>{copy.shelvesBody}</p>
      </VocabCard>

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
        {packs.length === 0 ? <p className={VOCAB_CARD_BODY_TITLE}>{copy.listsEmpty}</p> : null}
        {packs.length === 1 && packs[0] ? (
          <button
            type="button"
            className={`block w-full text-left ${VOCAB_CARD_BODY_TITLE}`}
            onClick={() => {
              setListKey({ kind: 'pack', packId: packs[0].id })
              setView('list')
            }}
          >
            {copy.listsFilled(packTitle ?? packs[0].title)}
          </button>
        ) : null}
        {packs.length > 1 ? (
          <div className="space-y-1">
            {packs.map((pack) => (
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

      <VocabCard
        title={copy.catalogTitle}
        insetCta={
          <VocabCardFooterButton
            placement="inset"
            variant="expand"
            label={copy.catalogOpen}
            onClick={() => setView('catalog')}
          />
        }
      >
        <p className={VOCAB_CARD_BODY_REASON}>{copy.catalogBody}</p>
      </VocabCard>
    </VocabHubShell>
  )
}
