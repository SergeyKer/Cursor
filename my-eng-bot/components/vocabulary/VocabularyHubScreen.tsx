'use client'

import React from 'react'
import MyPlanCard from '@/components/myPlan/MyPlanCard'
import MyPlanCardFooterButton from '@/components/myPlan/MyPlanCardFooterButton'
import VocabularyBridgeScreen from '@/components/vocabulary/VocabularyBridgeScreen'
import VocabularyListScreen from '@/components/vocabulary/VocabularyListScreen'
import VocabularyPackImportScreen from '@/components/vocabulary/VocabularyPackImportScreen'
import VocabularySpaceScroll from '@/components/vocabulary/VocabularySpaceScroll'
import VocabularyThinSession from '@/components/vocabulary/VocabularyThinSession'
import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import { customPackToNecessaryWords } from '@/lib/vocabulary/customPackAdapter'
import {
  loadPackWords,
  pauseSessionWords,
  pickVocabFuel,
  rankVocabNowCta,
  type VocabNowKind,
} from '@/lib/vocabulary/fuel'
import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
  patchWordProgress,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { lemmaKeyFromEn, listByFeedStatus, setUserMark } from '@/lib/vocabulary/wordFeed'
import { vocabHubCopy, vocabHubFooter, vocabNowBody } from '@/lib/uiCopy/vocabularyHub'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
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

type HubView = 'hub' | 'list' | 'import' | 'sprint' | 'bridge'
type ListKey =
  | { kind: 'world'; worldId: VocabularyWorldId }
  | { kind: 'errors' }
  | { kind: 'mastered' }
  | { kind: 'bank' }
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
  const [view, setView] = React.useState<HubView>('hub')
  const [listKey, setListKey] = React.useState<ListKey | null>(null)
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [sprintWords, setSprintWords] = React.useState<NecessaryWord[]>([])
  const [sprintRoute, setSprintRoute] = React.useState<VocabularySessionRoute>({ kind: 'world', worldId: 'home' })
  const [sprintKey, setSprintKey] = React.useState(0)
  const [bridgeLemmas, setBridgeLemmas] = React.useState<VocabularyFocusLemma[]>([])
  const [nowKind, setNowKind] = React.useState<VocabNowKind>('empty')

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
      setSprintWords([])
    })
    return () => onRegisterLeaveHandler?.(null)
  }, [onRegisterLeaveHandler])

  React.useEffect(() => {
    if (exitRequestKey <= 0) return
    setView('hub')
    setSprintWords([])
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

  const masteredCount = Object.values(progress.words).filter((row) => row.feedStatus === 'mastered').length
  const errorCount = resolveMistakeWords(activeWords, packWords).length
  const bankCount = Object.values(progress.words).filter((row) => row.feedStatus === 'in_feed').length
  const nowBody = vocabNowBody(nowKind, audience)
  const nowCtaLabel = nowBody.cta === 'say' ? copy.say : nowBody.cta === 'pick' ? copy.pick : copy.start

  const fuelLemmas = () =>
    pickVocabFuel({
      words: activeWords,
      progressMap: progress.words,
      packWords,
      n: 3,
      mistakeLemmaKeys: new Set(loadVocabMistakes().map((item) => item.lemmaKey)),
    })

  const lemmasToWords = (lemmas: VocabularyFocusLemma[]) => {
    const pool = [...activeWords, ...packWords]
    return lemmas
      .map((lemma) => pool.find((word) => word.id === lemma.wordId || lemmaKeyFromEn(word.en) === lemma.lemmaKey))
      .filter((word): word is NecessaryWord => Boolean(word))
  }

  const startSprint = (words: NecessaryWord[], route: VocabularySessionRoute) => {
    if (words.length === 0) {
      setListKey({ kind: 'vitrine' })
      setView('list')
      return
    }
    setSprintWords(words.slice(0, 3))
    setSprintRoute(route)
    setSprintKey((n) => n + 1)
    setView('sprint')
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
      startSprint(pauseSessionWords({ words: activeWords, progressMap: progress.words, n: 2 }), {
        kind: 'world',
        worldId: 'home',
      })
      return
    }
    startSprint(lemmasToWords(fuelLemmas()), { kind: 'world', worldId: 'home' })
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
      let words = activeWords.filter((word) => word.primaryWorld === worldId)
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
    if (listKey.kind === 'errors') {
      return { title: 'Ошибки', words: resolveMistakeWords(activeWords, packWords), showMarks: false, sticky: copy.start }
    }
    if (listKey.kind === 'mastered') {
      return {
        title: copy.umeuTitle,
        words: listByFeedStatus([...activeWords, ...packWords], progress.words, 'mastered'),
        showMarks: false,
        sticky: null,
      }
    }
    return {
      title: 'В деле',
      words: listByFeedStatus([...activeWords, ...packWords], progress.words, 'in_feed'),
      showMarks: false,
      sticky: copy.say,
    }
  }

  if (view === 'sprint' && sprintWords.length > 0) {
    return (
      <VocabularyThinSession
        key={sprintKey}
        words={sprintWords}
        distractorPool={activeWords}
        route={sprintRoute}
        tempo="sprint"
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
        onAgain={() => startSprint(lemmasToWords(fuelLemmas()), sprintRoute)}
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
        allowSearch={listKey.kind === 'mastered' || listKey.kind === 'pack' || audience === 'adult'}
        onBack={() => setView('hub')}
        onStudy={(word) => persistMark(word, 'study')}
        onKnow={(word) => persistMark(word, 'know')}
        onSticky={() => {
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
          const fromList = pickVocabFuel({
            words: bundle.words,
            progressMap: progress.words,
            packWords: listKey.kind === 'pack' ? bundle.words : [],
            n: 3,
            mistakeLemmaKeys: new Set(loadVocabMistakes().map((item) => item.lemmaKey)),
          })
          startSprint(lemmasToWords(fromList).length ? lemmasToWords(fromList) : bundle.words.filter((word) => {
            const mark = progress.words[String(word.id)]?.userMark
            return mark === 'study' || listKey.kind === 'pack' || listKey.kind === 'errors'
          }).slice(0, 3), listKey.kind === 'pack'
            ? { kind: 'pack', packId: listKey.packId }
            : { kind: 'world', worldId: listKey.kind === 'world' ? listKey.worldId : 'home' })
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
          title={copy.umeuTitle}
          footer={
            <MyPlanCardFooterButton
              variant="expand"
              label={copy.umeuCta}
              onClick={() => {
                setListKey({ kind: 'mastered' })
                setView('list')
              }}
            />
          }
        >
          <p className="text-[28px] font-semibold text-[var(--text)]">{masteredCount}</p>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            {masteredCount === 0 ? copy.umeuEmpty : copy.umeuFilled}
          </p>
        </MyPlanCard>

        <MyPlanCard
          title={copy.nowTitle}
          footer={
            <MyPlanCardFooterButton variant="launch" label={nowCtaLabel} onClick={handleNow} />
          }
        >
          <p className="text-[15px] font-semibold text-[var(--text)]">{nowBody.title}</p>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{nowBody.reason}</p>
        </MyPlanCard>

        {errorCount > 0 || bankCount > 0 ? (
          <button
            type="button"
            className="px-1 text-left text-[13px] text-[var(--text-muted)]"
            onClick={() => {
              setListKey(errorCount > 0 ? { kind: 'errors' } : { kind: 'bank' })
              setView('list')
            }}
          >
            {[errorCount > 0 ? copy.debtErrors(errorCount) : '', bankCount > 0 ? copy.debtBank(bankCount) : '']
              .filter(Boolean)
              .join(' · ')}
          </button>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
          {worlds.map((world) => (
            <button
              key={world.id}
              type="button"
              className="flex w-full min-h-[44px] items-center justify-between border-b border-[var(--border)]/70 px-3 py-2.5 text-left text-[15px] last:border-b-0"
              onClick={() => {
                setListKey({ kind: 'world', worldId: world.id })
                setView('list')
              }}
            >
              {world.title}
              <span className="text-[var(--text-muted)]">›</span>
            </button>
          ))}
          {audience === 'adult' && onOpenByLevel ? (
            <button
              type="button"
              className="flex w-full min-h-[44px] items-center justify-between px-3 py-2.5 text-left text-[15px] text-[var(--text-muted)]"
              onClick={onOpenByLevel}
            >
              По уровню
              <span>›</span>
            </button>
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
