'use client'

import React from 'react'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import { speak } from '@/lib/speech'
import { buildNecessaryWordsChatPrompt } from '@/lib/vocabulary/chatStub'
import { isWordInProgress, listStrictlyLearnedWords } from '@/lib/vocabulary/learned'
import { VOCABULARY_LEVELS } from '@/lib/vocabulary/levels'
import { buildSessionWords } from '@/lib/vocabulary/srs'
import {
  createEmptyVocabularyProgress,
  finalizeVocabularySession,
  loadVocabularyProgress,
  recordWordReview,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { VOCABULARY_TOPICS } from '@/lib/vocabulary/topics'
import type {
  NecessaryWord,
  NecessaryWordsCatalog,
  VocabularyFooterView,
  VocabularyLevelId,
  VocabularyProgressState,
  VocabularyTopicId,
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
  levelId: VocabularyLevelId
  topicId: VocabularyTopicId
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

type HubTab = 'levels' | 'learned'

type VocabularyByLevelScreenProps = {
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

function buildQuizOptions(targetWord: NecessaryWord, pool: NecessaryWord[]): string[] {
  const distractors = shuffle(
    pool
      .filter((word) => word.id !== targetWord.id)
      .map((word) => word.ru)
      .filter((translation, index, list) => list.indexOf(translation) === index)
  ).slice(0, 3)

  return shuffle([targetWord.ru, ...distractors])
}

function createLevelSession(
  levelId: VocabularyLevelId,
  topicId: VocabularyTopicId,
  words: NecessaryWord[],
  catalog: NecessaryWordsCatalog | null
): SessionRun | null {
  if (words.length === 0) return null
  const label = `${getLevelPrefix(levelId, catalog)} · ${getTopicTitle(topicId, catalog)}`
  return {
    id: `vocab-level-${Date.now()}`,
    levelId,
    topicId,
    words,
    phase: 'cards',
    cardIndex: 0,
    quizIndex: 0,
    voiceIndex: 0,
    quizAnswers: [],
    voiceAcceptedIds: [],
    startedAt: Date.now(),
    promptPreview: buildNecessaryWordsChatPrompt(words, label),
  }
}

export default function VocabularyByLevelScreen({
  onBackToLessons,
  onFooterViewChange,
}: VocabularyByLevelScreenProps) {
  const [catalog, setCatalog] = React.useState<NecessaryWordsCatalog | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [messages, setMessages] = React.useState<LocalMessage[]>([])
  const [session, setSession] = React.useState<SessionRun | null>(null)
  const [hubTab, setHubTab] = React.useState<HubTab>('levels')
  const [browseLevelId, setBrowseLevelId] = React.useState<VocabularyLevelId | null>(null)
  const [learnedFilter, setLearnedFilter] = React.useState('')
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

  const levelList = catalog?.levels?.length ? catalog.levels : VOCABULARY_LEVELS
  const topicList = catalog?.topics?.length ? catalog.topics : VOCABULARY_TOPICS

  React.useEffect(() => {
    if (session) {
      const routeTitle = `${getLevelPrefix(session.levelId, catalog)} · ${getTopicTitle(session.topicId, catalog)}`
      const footerByPhase: Record<SessionPhase, VocabularyFooterView> = {
        cards: {
          dynamicText: 'Слушай слово, смотри на карточку и двигайся дальше.',
          staticText: `${routeTitle} | Карточки ${Math.min(session.cardIndex + 1, session.words.length)}/${session.words.length}`,
          typingKey: `vocab-lvl-cards-${session.id}-${session.cardIndex}`,
        },
        quiz: {
          dynamicText: 'Мини-игра: выбери правильный перевод.',
          staticText: `${routeTitle} | Игра ${Math.min(session.quizIndex + 1, session.words.length)}/${session.words.length}`,
          typingKey: `vocab-lvl-quiz-${session.id}-${session.quizIndex}`,
        },
        voice: {
          dynamicText: 'Скажи слово вслух и закрепи его голосом.',
          staticText: `${routeTitle} | Голос ${Math.min(session.voiceIndex + 1, Math.min(2, session.words.length))}/${Math.min(2, session.words.length)}`,
          typingKey: `vocab-lvl-voice-${session.id}-${session.voiceIndex}`,
        },
        reward: {
          dynamicText: 'Сессия готова. Забирай монеты и двигайся дальше.',
          staticText: `${routeTitle} | Награда`,
          typingKey: `vocab-lvl-reward-${session.id}`,
        },
      }
      onFooterViewChange?.(footerByPhase[session.phase])
      return
    }

    if (hubTab === 'learned') {
      onFooterViewChange?.({
        dynamicText: 'Здесь слова со стабильным закреплением по SRS.',
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
      dynamicText: 'Выбери уровень CEFR или открой список выученных слов.',
      staticText: 'Слова по уровням | Уровни',
      typingKey: 'vocab-level-hub-footer',
    })
  }, [onFooterViewChange, session, hubTab, browseLevelId, catalog])

  const startTopicSession = React.useCallback(
    (levelId: VocabularyLevelId, topicId: VocabularyTopicId) => {
      const pool = wordsForLevelTopic(activeWords, levelId, topicId)
      const plannedWords = buildSessionWords({ words: pool, progressMap: progress.words, size: 5 })
      const nextSession = createLevelSession(levelId, topicId, plannedWords, catalog)
      if (!nextSession) return

      const title = `${getLevelPrefix(levelId, catalog)} · ${getTopicTitle(topicId, catalog)}`
      setMessages([
        {
          id: `${nextSession.id}-intro`,
          role: 'assistant',
          text: `Привет! Уровень и тема: «${title}». Сначала карточки, потом мини-игра и короткий голосовой шаг.`,
        },
      ])
      setVoiceTranscript('')
      setVoiceError(null)
      setChatStubCopied(false)
      setSession(nextSession)
    },
    [activeWords, catalog, progress.words]
  )

  const topicPool = React.useMemo(() => {
    if (!session) return []
    return wordsForLevelTopic(activeWords, session.levelId, session.topicId)
  }, [activeWords, session])

  const currentCardWord = session?.phase === 'cards' ? session.words[session.cardIndex] ?? null : null
  const currentQuizWord = session?.phase === 'quiz' ? session.words[session.quizIndex] ?? null : null
  const currentVoiceWord =
    session?.phase === 'voice'
      ? session.words[Math.min(session.voiceIndex, Math.min(2, session.words.length) - 1)] ?? null
      : null

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
      if (!currentQuizWord || !session) return
      const wasCorrect = selected === currentQuizWord.ru

      setSession((current) => {
        if (!current || current.phase !== 'quiz') return current
        const nextAnswers = [...current.quizAnswers, { wordId: currentQuizWord.id, selected, isCorrect: wasCorrect }]

        setProgress((prev) => {
          const updatedProgress = recordWordReview({
            state: prev,
            wordId: currentQuizWord.id,
            wasCorrect,
          })
          saveVocabularyProgress(updatedProgress)
          return updatedProgress
        })

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
    [currentQuizWord, progress, session]
  )

  const finishVoiceStep = React.useCallback(
    (accepted: boolean) => {
      setSession((current) => {
        if (!current || current.phase !== 'voice' || !currentVoiceWord) return current
        const nextAcceptedIds =
          accepted && !current.voiceAcceptedIds.includes(currentVoiceWord.id)
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
    },
    [currentVoiceWord]
  )

  const handleStartVoiceRecognition = React.useCallback(() => {
    const RecognitionCtor =
      typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined

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

    const coinsEarned =
      session.quizAnswers.filter((answer) => answer.isCorrect).length * 4 + session.voiceAcceptedIds.length * 3 + 6
    const learnedWordIds = session.quizAnswers.filter((answer) => answer.isCorrect).map((answer) => answer.wordId)
    const historyItem = {
      id: session.id,
      route: { kind: 'level' as const, levelId: session.levelId, topicId: session.topicId },
      startedAt: session.startedAt,
      completedAt: Date.now(),
      reviewedWordIds: session.words.map((word) => word.id),
      learnedWordIds,
      coinsEarned,
      promptPreview: session.promptPreview,
    }

    setProgress((prev) => {
      const nextProgress = finalizeVocabularySession({ state: prev, historyItem, coinsEarned })
      saveVocabularyProgress(nextProgress)
      return nextProgress
    })
    setMessages((prev) => [
      ...prev,
      {
        id: `${session.id}-reward`,
        role: 'assistant',
        text: `Сессия завершена. Ты заработал ${coinsEarned} 🪙. Хочешь потом обсудить эти слова с MyEng — кнопка уже готова.`,
      },
    ])
  }, [session])

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

  const hubBody = !session && (
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
          <div className="space-y-3">
            {topicList.map((topic) => {
              const pool = wordsForLevelTopic(activeWords, browseLevelId, topic.id)
              if (pool.length === 0) return null
              const reviewed = countWordsInProgress(progress, pool)
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
                      onClick={() => startTopicSession(browseLevelId, topic.id)}
                      className="btn-3d-menu shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--text)]"
                    >
                      Играть
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
              Пока нет слов в архиве «выучено». Нужны несколько верных ответов подряд по SRS — после этого слово попадёт сюда и
              не будет мешать в новых сессиях.
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
                    {getLevelPrefix(entry.word.primaryLevel, catalog)} · {getTopicTitle(entry.word.primaryVocabularyTopic, catalog)}
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
          ) : !session ? (
            hubBody
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
                      {buildQuizOptions(currentQuizWord, topicPool.length > 1 ? topicPool : session.words).map((option) => (
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
                      Слова из сессии уже записаны в локальный прогресс.
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
                        Вернуться к уровням
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
