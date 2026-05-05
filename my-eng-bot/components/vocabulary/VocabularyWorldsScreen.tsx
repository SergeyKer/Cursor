'use client'

import React from 'react'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import { speak } from '@/lib/speech'
import { buildNecessaryWordsChatPrompt } from '@/lib/vocabulary/chatStub'
import { buildWorldSessionWords } from '@/lib/vocabulary/srs'
import {
  createEmptyVocabularyProgress,
  finalizeVocabularySession,
  loadVocabularyProgress,
  recordWordReview,
  saveVocabularyProgress,
  unlockWorld,
} from '@/lib/vocabulary/storage'
import { VOCABULARY_WORLDS } from '@/lib/vocabulary/worlds'
import type {
  NecessaryWord,
  NecessaryWordsCatalog,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularyWorldId,
} from '@/types/vocabulary'

type SessionPhase = 'cards' | 'quiz' | 'voice' | 'reward'

type LocalMessage = {
  id: string
  role: BubbleRole
  text: string
}

type SessionAnswer = {
  wordId: number
  selected: string
  isCorrect: boolean
}

type SessionRun = {
  id: string
  worldId: VocabularyWorldId
  words: NecessaryWord[]
  phase: SessionPhase
  cardIndex: number
  quizIndex: number
  voiceIndex: number
  quizAnswers: SessionAnswer[]
  voiceAcceptedIds: number[]
  startedAt: number
  promptPreview: string
}

type VocabularyWorldsScreenProps = {
  onBackToLessons: () => void
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
}

type BrowserSpeechRecognition = SpeechRecognition & {
  maxAlternatives?: number
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!]
  }
  return next
}

function normalizeSpeechText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function getWorldTitle(worldId: VocabularyWorldId): string {
  return VOCABULARY_WORLDS.find((world) => world.id === worldId)?.title ?? 'Мир'
}

function nextWorldId(worldId: VocabularyWorldId): VocabularyWorldId | null {
  const index = VOCABULARY_WORLDS.findIndex((world) => world.id === worldId)
  if (index === -1 || index >= VOCABULARY_WORLDS.length - 1) return null
  return VOCABULARY_WORLDS[index + 1]?.id ?? null
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

function countReviewedWords(state: VocabularyProgressState, words: NecessaryWord[]): number {
  return words.filter((word) => (state.words[String(word.id)]?.successes ?? 0) > 0).length
}

function unlockThreshold(wordCount: number): number {
  return Math.max(6, Math.min(18, Math.ceil(wordCount * 0.18)))
}

function buildQuizOptions(targetWord: NecessaryWord, pool: NecessaryWord[]): string[] {
  const distractors = shuffle(
    pool
      .filter((word) => word.id !== targetWord.id)
      .map((word) => word.ru)
      .filter((translation, index, list) => list.indexOf(translation) === index)
  ).slice(0, 3)

  return shuffle([targetWord.ru, ...distractors])
}

function createSession(worldId: VocabularyWorldId, words: NecessaryWord[]): SessionRun | null {
  if (words.length === 0) return null
  return {
    id: `vocab-${Date.now()}`,
    worldId,
    words,
    phase: 'cards',
    cardIndex: 0,
    quizIndex: 0,
    voiceIndex: 0,
    quizAnswers: [],
    voiceAcceptedIds: [],
    startedAt: Date.now(),
    promptPreview: buildNecessaryWordsChatPrompt(words, getWorldTitle(worldId)),
  }
}

export default function VocabularyWorldsScreen({
  onBackToLessons,
  onFooterViewChange,
}: VocabularyWorldsScreenProps) {
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [messages, setMessages] = React.useState<LocalMessage[]>([])
  const [session, setSession] = React.useState<SessionRun | null>(null)
  const [showStats, setShowStats] = React.useState(false)
  const [chatStubCopied, setChatStubCopied] = React.useState(false)
  const [voiceTranscript, setVoiceTranscript] = React.useState('')
  const [voiceListening, setVoiceListening] = React.useState(false)
  const [voiceError, setVoiceError] = React.useState<string | null>(null)
  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)

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
      recognitionRef.current?.stop?.()
      onFooterViewChange?.(null)
    }
  }, [onFooterViewChange])

  React.useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [messages.length, session?.phase, session?.cardIndex, session?.quizIndex, session?.voiceIndex])

  const activeWords = React.useMemo(
    () => (catalog?.words ?? []).filter((word) => word.status === 'active'),
    [catalog]
  )
  const worldMap = React.useMemo(() => buildWorldCounts(activeWords), [activeWords])

  React.useEffect(() => {
    if (!session) {
      onFooterViewChange?.({
        dynamicText: showStats ? 'Смотри, как растёт прогресс по словам.' : 'Выбери мир и начни короткую сессию.',
        staticText: showStats ? 'Необходимые слова | Статистика' : 'Необходимые слова | Карта миров',
        typingKey: showStats ? 'vocab-stats-footer' : 'vocab-hub-footer',
      })
      return
    }

    const currentWorldTitle = getWorldTitle(session.worldId)
    const footerByPhase: Record<SessionPhase, VocabularyFooterView> = {
      cards: {
        dynamicText: 'Слушай слово, смотри на карточку и двигайся дальше.',
        staticText: `${currentWorldTitle} | Карточки ${Math.min(session.cardIndex + 1, session.words.length)}/${session.words.length}`,
        typingKey: `vocab-cards-${session.id}-${session.cardIndex}`,
      },
      quiz: {
        dynamicText: 'Мини-игра: выбери правильный перевод.',
        staticText: `${currentWorldTitle} | Игра ${Math.min(session.quizIndex + 1, session.words.length)}/${session.words.length}`,
        typingKey: `vocab-quiz-${session.id}-${session.quizIndex}`,
      },
      voice: {
        dynamicText: 'Скажи слово вслух и закрепи его голосом.',
        staticText: `${currentWorldTitle} | Голос ${Math.min(session.voiceIndex + 1, Math.min(2, session.words.length))}/${Math.min(2, session.words.length)}`,
        typingKey: `vocab-voice-${session.id}-${session.voiceIndex}`,
      },
      reward: {
        dynamicText: 'Сессия готова. Забирай монеты и двигайся дальше.',
        staticText: `${currentWorldTitle} | Награда`,
        typingKey: `vocab-reward-${session.id}`,
      },
    }

    onFooterViewChange?.(footerByPhase[session.phase])
  }, [onFooterViewChange, session, showStats])

  const startWorldSession = React.useCallback(
    (worldId: VocabularyWorldId) => {
      const pool = worldMap[worldId] ?? []
      const plannedWords = buildWorldSessionWords({ words: pool, progressMap: progress.words, size: 5 })
      const nextSession = createSession(worldId, plannedWords)
      if (!nextSession) return

      setMessages([
        {
          id: `${nextSession.id}-intro`,
          role: 'assistant',
          text: `Привет! Начинаем мир «${getWorldTitle(worldId)}». Сначала посмотрим несколько слов, потом сыграем и в конце повторим их вслух.`,
        },
      ])
      setVoiceTranscript('')
      setVoiceError(null)
      setChatStubCopied(false)
      setSession(nextSession)
      setShowStats(false)
    },
    [progress.words, worldMap]
  )

  const currentCardWord = session?.phase === 'cards' ? session.words[session.cardIndex] ?? null : null
  const currentQuizWord = session?.phase === 'quiz' ? session.words[session.quizIndex] ?? null : null
  const currentVoiceWord =
    session?.phase === 'voice' ? session.words[Math.min(session.voiceIndex, Math.min(2, session.words.length) - 1)] ?? null : null

  const handleNextCard = React.useCallback(() => {
    setSession((current) => {
      if (!current || current.phase !== 'cards') return current
      if (current.cardIndex >= current.words.length - 1) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${current.id}-quiz-ready`,
            role: 'assistant',
            text: 'Отлично. Теперь быстрая мини-игра: выбирай правильный перевод.',
          },
        ])
        return { ...current, phase: 'quiz', cardIndex: current.words.length - 1, quizIndex: 0 }
      }

      const nextIndex = current.cardIndex + 1
      const nextWord = current.words[nextIndex]
      if (nextWord) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${current.id}-card-${nextWord.id}`,
            role: 'assistant',
            text: `Следующее слово: ${nextWord.en}. Нажми «Слушать» и посмотри перевод.`,
          },
        ])
      }
      return { ...current, cardIndex: nextIndex }
    })
  }, [])

  const handleQuizAnswer = React.useCallback(
    (selected: string) => {
      if (!currentQuizWord) return
      const wasCorrect = selected === currentQuizWord.ru

      setSession((current) => {
        if (!current || current.phase !== 'quiz') return current
        const nextAnswers = [...current.quizAnswers, { wordId: currentQuizWord.id, selected, isCorrect: wasCorrect }]

        const updatedProgress = recordWordReview({
          state: progress,
          wordId: currentQuizWord.id,
          wasCorrect,
        })
        setProgress(updatedProgress)
        saveVocabularyProgress(updatedProgress)

        setMessages((prev) => [
          ...prev,
          { id: `${current.id}-user-${currentQuizWord.id}`, role: 'user', text: selected },
          {
            id: `${current.id}-assistant-${currentQuizWord.id}`,
            role: 'assistant',
            text: wasCorrect ? 'Верно. Запоминаем и идём дальше.' : `Почти. Правильный вариант: ${currentQuizWord.ru}.`,
          },
        ])

        if (current.quizIndex >= current.words.length - 1) {
          setMessages((prev) => [
            ...prev,
            {
              id: `${current.id}-voice-ready`,
              role: 'assistant',
              text: 'Теперь голосовой шаг. Повтори слово вслух, чтобы закрепить его ещё сильнее.',
            },
          ])
          return { ...current, quizAnswers: nextAnswers, phase: 'voice', quizIndex: current.words.length - 1, voiceIndex: 0 }
        }

        return { ...current, quizAnswers: nextAnswers, quizIndex: current.quizIndex + 1 }
      })
    },
    [currentQuizWord, progress]
  )

  const finishVoiceStep = React.useCallback((accepted: boolean) => {
    setSession((current) => {
      if (!current || current.phase !== 'voice' || !currentVoiceWord) return current
      const nextAcceptedIds = accepted && !current.voiceAcceptedIds.includes(currentVoiceWord.id)
        ? [...current.voiceAcceptedIds, currentVoiceWord.id]
        : current.voiceAcceptedIds

      setMessages((prev) => [
        ...prev,
        {
          id: `${current.id}-voice-feedback-${currentVoiceWord.id}-${current.voiceIndex}`,
          role: 'assistant',
          text: accepted
            ? `Отлично, слово "${currentVoiceWord.en}" прозвучало уверенно.`
            : `Хорошая попытка. Слово "${currentVoiceWord.en}" можно будет повторить ещё раз позже.`,
        },
      ])

      const voiceStepsTotal = Math.min(2, current.words.length)
      if (current.voiceIndex >= voiceStepsTotal - 1) {
        return { ...current, phase: 'reward', voiceAcceptedIds: nextAcceptedIds }
      }

      return { ...current, voiceAcceptedIds: nextAcceptedIds, voiceIndex: current.voiceIndex + 1 }
    })
    setVoiceTranscript('')
    setVoiceError(null)
  }, [currentVoiceWord])

  const handleStartVoiceRecognition = React.useCallback(() => {
    const RecognitionCtor = typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined

    if (!RecognitionCtor) {
      setVoiceError('В этом браузере микрофон недоступен. Нажми кнопку «Я повторил вслух».')
      return
    }

    recognitionRef.current?.stop?.()
    const recognition = new RecognitionCtor() as BrowserSpeechRecognition
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    setVoiceTranscript('')
    setVoiceError(null)
    setVoiceListening(true)

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      setVoiceTranscript(transcript)
    }
    recognition.onerror = () => {
      setVoiceListening(false)
      setVoiceError('Не удалось распознать речь. Можно попробовать ещё раз или продолжить вручную.')
    }
    recognition.onend = () => {
      setVoiceListening(false)
    }
    recognition.start()
  }, [])

  const completeSession = React.useCallback(() => {
    if (!session) return

    const coinsEarned = session.quizAnswers.filter((answer) => answer.isCorrect).length * 4 + session.voiceAcceptedIds.length * 3 + 6
    const learnedWordIds = session.quizAnswers.filter((answer) => answer.isCorrect).map((answer) => answer.wordId)
    const historyItem = {
      id: session.id,
      worldId: session.worldId,
      startedAt: session.startedAt,
      completedAt: Date.now(),
      reviewedWordIds: session.words.map((word) => word.id),
      learnedWordIds,
      coinsEarned,
      promptPreview: session.promptPreview,
    }

    const worldWords = worldMap[session.worldId] ?? []
    let nextProgress = finalizeVocabularySession({ state: progress, historyItem, coinsEarned })
    const learnedInWorld = countReviewedWords(nextProgress, worldWords)
    const unlockTarget = nextWorldId(session.worldId)
    if (unlockTarget && learnedInWorld >= unlockThreshold(worldWords.length)) {
      nextProgress = unlockWorld(nextProgress, unlockTarget)
    }

    setProgress(nextProgress)
    saveVocabularyProgress(nextProgress)
    setMessages((prev) => [
      ...prev,
      {
        id: `${session.id}-reward`,
        role: 'assistant',
        text: `Сессия завершена. Ты заработал ${coinsEarned} 🪙. Хочешь потом обсудить эти слова с MyEng — кнопка уже готова.`,
      },
    ])
  }, [progress, session, worldMap])

  React.useEffect(() => {
    if (session?.phase !== 'reward') return
    completeSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase])

  const handleCopyChatPrompt = React.useCallback(async () => {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.promptPreview)
      setChatStubCopied(true)
    } catch {
      setChatStubCopied(false)
    }
  }, [session])

  const worldCards = VOCABULARY_WORLDS.map((world) => {
    const words = worldMap[world.id] ?? []
    const reviewed = countReviewedWords(progress, words)
    const unlocked = progress.stats.unlockedWorldIds.includes(world.id)

    return { world, words, reviewed, unlocked }
  })

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
          ) : !session ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-3 py-3 shadow-sm">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Монеты</p>
                  <p className="mt-1 text-[22px] font-bold text-[var(--text)]">{progress.stats.coins}</p>
                </div>
                <div className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-3 py-3 shadow-sm">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Сессии</p>
                  <p className="mt-1 text-[22px] font-bold text-[var(--text)]">{progress.stats.completedSessions}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-[var(--text-muted)]">Выбери мир и начни сессию на 5-7 минут.</p>
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
                          <p className="font-semibold text-[var(--text)]">{getWorldTitle(item.worldId)}</p>
                          <p>{item.reviewedWordIds.length} слов, {item.coinsEarned} 🪙, {new Date(item.completedAt).toLocaleDateString('ru-RU')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {worldCards.map(({ world, words, reviewed, unlocked }) => (
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
                        <p className="text-[17px] font-semibold text-[var(--text)]">{world.badge} {world.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{world.description}</p>
                        <p className="mt-2 text-[12px] font-medium text-[var(--text-muted)]">
                          Пройдено слов: {reviewed}/{words.length}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!unlocked || words.length === 0}
                        onClick={() => startWorldSession(world.id)}
                        className="btn-3d-menu rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {unlocked ? 'Играть' : 'Закрыт'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="glass-surface flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] p-3 shadow-sm"
              >
                <div className="space-y-2">
                  {messages.map((message, index) => {
                    const previousRole = messages[index - 1]?.role
                    const nextRole = messages[index + 1]?.role
                    const position = getBubblePosition(previousRole, message.role, nextRole)
                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role={message.role}
                        position={position}
                        rowClassName={position === 'last' || position === 'solo' ? 'mb-2' : 'mb-0.5'}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      </ChatBubbleFrame>
                    )
                  })}
                </div>

                {session.phase === 'cards' && currentCardWord && (
                  <div className="mt-3 rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-4 shadow-sm">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Карточка слова</p>
                    <p className="mt-2 text-[28px] font-bold text-[var(--text)]">{currentCardWord.en}</p>
                    <p className="mt-1 text-[14px] text-[var(--text-muted)]">{currentCardWord.transcription}</p>
                    <p className="mt-3 text-[17px] font-semibold text-[var(--text)]">{currentCardWord.ru}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => speak(currentCardWord.en, '')}
                        className="btn-3d-menu flex-1 rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
                      >
                        Слушать
                      </button>
                      <button
                        type="button"
                        onClick={handleNextCard}
                        className="btn-3d-menu flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)]"
                      >
                        Дальше
                      </button>
                    </div>
                  </div>
                )}

                {session.phase === 'quiz' && currentQuizWord && (
                  <div className="mt-3 rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-4 shadow-sm">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Мини-игра</p>
                    <p className="mt-2 text-[20px] font-bold text-[var(--text)]">{currentQuizWord.en}</p>
                    <div className="mt-4 space-y-2">
                      {buildQuizOptions(currentQuizWord, worldMap[session.worldId] ?? session.words).map((option) => (
                        <button
                          key={`${currentQuizWord.id}-${option}`}
                          type="button"
                          onClick={() => handleQuizAnswer(option)}
                          className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-left text-[15px] font-semibold text-[var(--text)]"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {session.phase === 'voice' && currentVoiceWord && (
                  <div className="mt-3 rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-4 shadow-sm">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Голосовой шаг</p>
                    <p className="mt-2 text-[22px] font-bold text-[var(--text)]">{currentVoiceWord.en}</p>
                    <p className="mt-1 text-[14px] text-[var(--text-muted)]">{currentVoiceWord.transcription}</p>
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => speak(currentVoiceWord.en, '')}
                        className="btn-3d-menu rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
                      >
                        Слушать ещё раз
                      </button>
                      <button
                        type="button"
                        onClick={handleStartVoiceRecognition}
                        className="btn-3d-menu rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)]"
                      >
                        {voiceListening ? 'Слушаю...' : 'Включить микрофон'}
                      </button>
                      {voiceTranscript && (
                        <p className="rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] text-[var(--text)]">
                          Услышал: {voiceTranscript}
                        </p>
                      )}
                      {voiceError && (
                        <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                          {voiceError}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const accepted = normalizeSpeechText(voiceTranscript).includes(normalizeSpeechText(currentVoiceWord.en))
                            finishVoiceStep(accepted)
                          }}
                          className="btn-3d-menu rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
                        >
                          Проверить
                        </button>
                        <button
                          type="button"
                          onClick={() => finishVoiceStep(true)}
                          className="btn-3d-menu rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text)]"
                        >
                          Я повторил вслух
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {session.phase === 'reward' && (
                  <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
                    <p className="text-[20px] font-bold text-emerald-700">Награда готова</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-emerald-800">
                      Слова из сессии уже записаны в локальный прогресс. Когда захотите, можно перейти в чат позже по готовому промпту.
                    </p>
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={handleCopyChatPrompt}
                        className="btn-3d-menu w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-base font-semibold text-emerald-700"
                      >
                        Скопировать промпт для чата
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSession(null)
                          setMessages([])
                          setVoiceTranscript('')
                          setVoiceError(null)
                        }}
                        className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
                      >
                        Вернуться к мирам
                      </button>
                    </div>
                    <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                      {chatStubCopied ? 'Промпт скопирован в буфер обмена.' : session.promptPreview}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
