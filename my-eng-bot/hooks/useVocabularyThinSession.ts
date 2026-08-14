'use client'

import * as React from 'react'
import { buildSayPhraseForWord } from '@/lib/vocabulary/phraseTemplates'
import {
  buildQuizOptions,
  nextStep,
  shouldIncludePhrase,
  stepAfterSkippingSpeak,
  stepsForTempo,
  type WordStep,
} from '@/lib/vocabulary/sessionEngine'
import {
  finalizeVocabularySession,
  patchWordProgress,
  recordWordReview,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import {
  applyProduceResult,
  isProduceFilled,
  produceAccept,
  produceTargetLength,
  returnProduceLetter,
  scrambleProduceLetters,
  selectProduceLetter,
} from '@/lib/vocabulary/producePuzzle'
import { chipAccept, voiceAccept } from '@/lib/vocabulary/voiceAccept'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import { lemmaKeyFromEn, markWordPassed } from '@/lib/vocabulary/wordFeed'
import type { Audience } from '@/lib/types'
import { vocabSpeakFooterHint } from '@/lib/vocabulary/vocabSpeakComposer'
import type {
  NecessaryWord,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyTempo,
} from '@/types/vocabulary'

export type ThinSessionStatus = 'idle' | 'active' | 'completed' | 'aborted'

export type ThinSessionFinaleStats = {
  banked: number
  stillLearning: number
}

type WordRuntime = {
  checkPassed: boolean
  speakPassed: boolean
  phrasePassed: boolean
  phraseRequired: boolean
}

type UseVocabularyThinSessionParams = {
  setProgress: React.Dispatch<React.SetStateAction<VocabularyProgressState>>
  distractorPool: NecessaryWord[]
  routeTitle?: string
  audience?: Audience
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onSessionActiveChange?: (active: boolean) => void
}

function buildFooter(
  step: WordStep | null,
  status: ThinSessionStatus,
  routeTitle: string,
  wordIndex: number,
  sessionSize: number,
  sessionId: string,
  audience: Audience
): VocabularyFooterView {
  const progressLabel = `${Math.min(wordIndex + 1, sessionSize)}/${sessionSize}`
  const base = (dynamicText: string, staticSuffix: string, typingKey: string): VocabularyFooterView => ({
    dynamicText,
    staticText: `${routeTitle} | ${staticSuffix}`,
    typingKey,
  })

  if (status === 'completed') {
    return base('Карточки сданы. Дальше — сказать Engvo.', 'Финал', `vocab-thin-finale-${sessionId}`)
  }

  switch (step) {
    case 'reveal_en':
      return base('Запомни слово.', `Слово ${progressLabel}`, `vocab-thin-reveal-${sessionId}-${wordIndex}`)
    case 'check':
      return base('Выбери правильный перевод.', `Проверка ${progressLabel}`, `vocab-thin-check-${sessionId}-${wordIndex}`)
    case 'check_fail_say':
      return base(vocabSpeakFooterHint(audience), `Исправление ${progressLabel}`, `vocab-thin-fail-say-${sessionId}-${wordIndex}`)
    case 'produce':
      return base('Собери слово из букв.', `Сборка ${progressLabel}`, `vocab-thin-produce-${sessionId}-${wordIndex}`)
    case 'speak_en':
      return base(vocabSpeakFooterHint(audience), `Голос ${progressLabel}`, `vocab-thin-speak-${sessionId}-${wordIndex}`)
    case 'say_phrase':
      return base(vocabSpeakFooterHint(audience), `Фраза ${progressLabel}`, `vocab-thin-phrase-${sessionId}-${wordIndex}`)
    case 'done':
      return base('Слово закрыто. Дальше.', `Слово ${progressLabel}`, `vocab-thin-done-${sessionId}-${wordIndex}`)
    default:
      return base('Короткая сессия слов.', routeTitle, `vocab-thin-${sessionId}`)
  }
}

export function useVocabularyThinSession({
  setProgress,
  distractorPool,
  routeTitle = 'Слова',
  audience = 'adult',
  onFooterViewChange,
  onSessionActiveChange,
}: UseVocabularyThinSessionParams) {
  const [status, setStatus] = React.useState<ThinSessionStatus>('idle')
  const [words, setWords] = React.useState<NecessaryWord[]>([])
  const [route, setRoute] = React.useState<VocabularySessionRoute | null>(null)
  const [tempo, setTempo] = React.useState<VocabularyTempo>('sprint')
  const [sessionId, setSessionId] = React.useState('')
  const [startedAt, setStartedAt] = React.useState(0)
  const [wordIndex, setWordIndex] = React.useState(0)
  const [steps, setSteps] = React.useState<WordStep[]>([])
  const [step, setStep] = React.useState<WordStep | null>(null)
  const [quizOptions, setQuizOptions] = React.useState<string[]>([])
  const [produceTiles, setProduceTiles] = React.useState<string[]>([])
  const [produceSelected, setProduceSelected] = React.useState<string[]>([])
  const produceAssemblyRef = React.useRef({ tiles: produceTiles, selected: produceSelected })
  const [runtime, setRuntime] = React.useState<WordRuntime>({
    checkPassed: false,
    speakPassed: false,
    phrasePassed: false,
    phraseRequired: false,
  })
  const [bankedWordIds, setBankedWordIds] = React.useState<number[]>([])
  const [lastVoiceOk, setLastVoiceOk] = React.useState<boolean | null>(null)
  const [lastProduceOk, setLastProduceOk] = React.useState<boolean | null>(null)
  const bankedRef = React.useRef<number[]>([])
  const wordsRef = React.useRef<NecessaryWord[]>([])
  const routeRef = React.useRef<VocabularySessionRoute | null>(null)
  const startedAtRef = React.useRef(0)
  const sessionIdRef = React.useRef('')
  const tempoRef = React.useRef<VocabularyTempo>('sprint')

  produceAssemblyRef.current = { tiles: produceTiles, selected: produceSelected }

  const currentWord = status === 'active' || status === 'completed' ? words[wordIndex] ?? null : null
  const phraseTarget = currentWord ? buildSayPhraseForWord(currentWord) : ''

  const footerView = React.useMemo(() => {
    if (status === 'idle' || status === 'aborted') return null
    return buildFooter(step, status, routeTitle, wordIndex, words.length || 1, sessionId, audience)
  }, [status, step, routeTitle, wordIndex, words.length, sessionId, audience])

  React.useEffect(() => {
    onFooterViewChange?.(footerView)
  }, [footerView, onFooterViewChange])

  React.useEffect(() => {
    onSessionActiveChange?.(status === 'active')
    return () => onSessionActiveChange?.(false)
  }, [onSessionActiveChange, status])

  const prepareWord = React.useCallback(
    (list: NecessaryWord[], index: number, sessionTempo: VocabularyTempo) => {
      const word = list[index]
      if (!word) return
      const phraseRequired = shouldIncludePhrase(sessionTempo, index, list.length)
      const nextSteps = stepsForTempo(sessionTempo, phraseRequired)
      setSteps(nextSteps)
      setStep(nextSteps[0] ?? 'done')
      setRuntime({
        checkPassed: false,
        speakPassed: false,
        phrasePassed: false,
        phraseRequired,
      })
      setQuizOptions([])
      const tiles = scrambleProduceLetters(word.en)
      produceAssemblyRef.current = { tiles, selected: [] }
      setProduceTiles(tiles)
      setProduceSelected([])
      setLastVoiceOk(null)
      setLastProduceOk(null)
      setWordIndex(index)
    },
    []
  )

  const start = React.useCallback(
    (params: {
      words: NecessaryWord[]
      route: VocabularySessionRoute
      tempo: VocabularyTempo
    }) => {
      if (params.words.length === 0) return
      const id = `vocab-thin-${Date.now()}`
      const started = Date.now()
      setSessionId(id)
      sessionIdRef.current = id
      setStartedAt(started)
      startedAtRef.current = started
      setWords(params.words)
      wordsRef.current = params.words
      setRoute(params.route)
      routeRef.current = params.route
      setTempo(params.tempo)
      tempoRef.current = params.tempo
      setBankedWordIds([])
      bankedRef.current = []
      setStatus('active')
      prepareWord(params.words, 0, params.tempo)
    },
    [prepareWord]
  )

  const completeWord = React.useCallback(
    (flags: WordRuntime, word: NecessaryWord, list: NecessaryWord[], index: number) => {
      setProgress((prev) => {
        const current = prev.words[String(word.id)] ?? createEmptyWordProgress(word.id)
        const banked = markWordPassed({
          progress: current,
          checkPassed: flags.checkPassed,
          speakPassed: flags.speakPassed,
          phrasePassed: flags.phrasePassed,
          phraseRequired: flags.phraseRequired,
          lemmaKey: lemmaKeyFromEn(word.en),
          source: 'catalog',
        })

        let nextState = prev
        if (banked) {
          nextState = patchWordProgress(prev, word.id, banked)
          if (!bankedRef.current.includes(word.id)) {
            bankedRef.current = [...bankedRef.current, word.id]
          }
        }

        saveVocabularyProgress(nextState)
        return nextState
      })
      setBankedWordIds([...bankedRef.current])

      const nextIndex = index + 1
      if (nextIndex >= list.length) {
        const reviewedWordIds = list.map((item) => item.id)
        const bankedIds = bankedRef.current
        setProgress((prev) => {
          const historyItem = {
            id: sessionIdRef.current,
            route: routeRef.current!,
            startedAt: startedAtRef.current,
            completedAt: Date.now(),
            reviewedWordIds,
            learnedWordIds: bankedIds,
            bankedWordIds: bankedIds,
            coinsEarned: 0,
            promptPreview: '',
            tempo: tempoRef.current,
          }
          const next = finalizeVocabularySession({ state: prev, historyItem, coinsEarned: 0 })
          saveVocabularyProgress(next)
          return next
        })
        setStatus('completed')
        setStep('done')
        return
      }

      prepareWord(list, nextIndex, tempoRef.current)
    },
    [prepareWord, setProgress]
  )

  const advanceFrom = React.useCallback(
    (from: WordStep, flags: WordRuntime) => {
      const word = wordsRef.current[wordIndex]
      if (!word) return

      if (from === 'check_fail_say') {
        const after = stepAfterSkippingSpeak(steps)
        if (!after || after === 'done') {
          completeWord(flags, word, wordsRef.current, wordIndex)
          return
        }
        setStep(after)
        setLastVoiceOk(null)
        return
      }

      const upcoming = nextStep(steps, from)
      if (!upcoming || upcoming === 'done') {
        completeWord(flags, word, wordsRef.current, wordIndex)
        return
      }

      if (upcoming === 'check') {
        const pool = distractorPool.length > 1 ? distractorPool : wordsRef.current
        setQuizOptions(buildQuizOptions(word, pool))
      }
      if (upcoming === 'produce') {
        const tiles = scrambleProduceLetters(word.en)
        produceAssemblyRef.current = { tiles, selected: [] }
        setProduceTiles(tiles)
        setProduceSelected([])
        setLastProduceOk(null)
      }

      setStep(upcoming)
      setLastVoiceOk(null)
    },
    [completeWord, distractorPool, steps, wordIndex]
  )

  const goNextReveal = React.useCallback(() => {
    if (status !== 'active' || !step) return
    if (step !== 'reveal_en') return
    advanceFrom(step, runtime)
  }, [advanceFrom, runtime, status, step])

  const acceptChip = React.useCallback(
    (selected: string) => {
      if (status !== 'active' || step !== 'check' || !currentWord) return
      const wasCorrect = chipAccept(selected, currentWord.ru)

      setProgress((prev) => {
        const updated = recordWordReview({
          state: prev,
          wordId: currentWord.id,
          wasCorrect,
        })
        saveVocabularyProgress(updated)
        return updated
      })

      if (wasCorrect) {
        const nextFlags = { ...runtime, checkPassed: true }
        setRuntime(nextFlags)
        advanceFrom('check', nextFlags)
        return
      }

      const nextFlags = { ...runtime, checkPassed: false }
      setRuntime(nextFlags)
      setStep('check_fail_say')
      setLastVoiceOk(null)
    },
    [advanceFrom, currentWord, runtime, setProgress, status, step]
  )

  const tapProduceTile = React.useCallback(
    (letter: string, tileIndex: number) => {
      if (status !== 'active' || step !== 'produce' || !currentWord) return
      const targetLen = produceTargetLength(currentWord.en)
      const next = selectProduceLetter(
        produceAssemblyRef.current.tiles,
        produceAssemblyRef.current.selected,
        letter,
        tileIndex,
        targetLen
      )
      produceAssemblyRef.current = next
      setProduceTiles(next.tiles)
      setProduceSelected(next.selected)
      setLastProduceOk(null)
    },
    [currentWord, status, step]
  )

  const returnProduceSlot = React.useCallback(
    (slotIndex: number) => {
      if (status !== 'active' || step !== 'produce') return
      const next = returnProduceLetter(
        produceAssemblyRef.current.tiles,
        produceAssemblyRef.current.selected,
        slotIndex
      )
      produceAssemblyRef.current = next
      setProduceTiles(next.tiles)
      setProduceSelected(next.selected)
      setLastProduceOk(null)
    },
    [status, step]
  )

  const clearProduce = React.useCallback(() => {
    if (status !== 'active' || step !== 'produce' || !currentWord) return
    const tiles = scrambleProduceLetters(currentWord.en)
    const next = { tiles, selected: [] as string[] }
    produceAssemblyRef.current = next
    setProduceTiles(tiles)
    setProduceSelected([])
    setLastProduceOk(null)
  }, [currentWord, status, step])

  const submitProduce = React.useCallback(() => {
    if (status !== 'active' || step !== 'produce' || !currentWord) return
    const selected = produceAssemblyRef.current.selected
    if (!isProduceFilled(selected, currentWord.en)) return
    const ok = produceAccept(selected.join(''), currentWord.en)
    setLastProduceOk(ok)

    setProgress((prev) => {
      const current = prev.words[String(currentWord.id)] ?? createEmptyWordProgress(currentWord.id)
      const nextState = patchWordProgress(prev, currentWord.id, applyProduceResult(current, ok))
      saveVocabularyProgress(nextState)
      return nextState
    })

    if (!ok) {
      const tiles = scrambleProduceLetters(currentWord.en)
      const next = { tiles, selected: [] as string[] }
      produceAssemblyRef.current = next
      setProduceTiles(tiles)
      setProduceSelected([])
      return
    }

    advanceFrom('produce', runtime)
  }, [advanceFrom, currentWord, runtime, setProgress, status, step])

  const acceptVoice = React.useCallback(
    (transcript: string) => {
      if (status !== 'active' || !currentWord || !step) return false
      if (step !== 'check_fail_say' && step !== 'speak_en' && step !== 'say_phrase') return false

      const matched =
        step === 'say_phrase'
          ? voiceAccept({ transcript, target: phraseTarget, kind: 'en_phrase' })
          : voiceAccept({ transcript, target: currentWord.en, kind: 'en_word' })

      setLastVoiceOk(matched)

      // Soft-advance: always proceed after an attempt; credit only on match (no SRS fail).
      const nextFlags = { ...runtime }
      if (step === 'say_phrase') {
        if (matched) nextFlags.phrasePassed = true
      } else if (step === 'speak_en') {
        if (matched) nextFlags.speakPassed = true
      } else if (matched) {
        // check_fail_say: bank Speak✓ only if Check✓ already
        nextFlags.speakPassed = runtime.checkPassed
      }

      setRuntime(nextFlags)
      advanceFrom(step, nextFlags)
      return true
    },
    [advanceFrom, currentWord, phraseTarget, runtime, status, step]
  )

  const skipSpeakAccessibility = React.useCallback(() => {
    if (status !== 'active' || !step) return
    if (step !== 'check_fail_say' && step !== 'speak_en' && step !== 'say_phrase') return
    // Accessibility only: advance without speak/phrase credit for bank.
    advanceFrom(step, runtime)
  }, [advanceFrom, runtime, status, step])

  const abort = React.useCallback(() => {
    setStatus('aborted')
    setStep(null)
    setWords([])
    wordsRef.current = []
    onFooterViewChange?.(null)
  }, [onFooterViewChange])

  const finaleStats: ThinSessionFinaleStats = React.useMemo(() => {
    const banked = bankedWordIds.length
    const stillLearning = Math.max(0, words.length - banked)
    return { banked, stillLearning }
  }, [bankedWordIds.length, words.length])

  const bankedWords = React.useMemo(
    () => words.filter((word) => bankedWordIds.includes(word.id)),
    [bankedWordIds, words]
  )

  const produceFilled = Boolean(currentWord && isProduceFilled(produceSelected, currentWord.en))

  return {
    status,
    words,
    route,
    tempo,
    sessionId,
    currentWord,
    wordIndex,
    step,
    steps,
    quizOptions,
    produceTiles,
    produceSelected,
    produceFilled,
    phraseTarget,
    footerView,
    lastVoiceOk,
    lastProduceOk,
    bankedWordIds,
    bankedWords,
    finaleStats,
    start,
    acceptChip,
    acceptVoice,
    tapProduceTile,
    returnProduceSlot,
    clearProduce,
    submitProduce,
    skipSpeakAccessibility,
    goNextReveal,
    abort,
  }
}
