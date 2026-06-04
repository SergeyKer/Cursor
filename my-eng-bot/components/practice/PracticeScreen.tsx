'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import PracticeFinale from '@/components/practice/PracticeFinale'
import PracticeInstructionFlowInfoStep from '@/components/practice/PracticeInstructionFlowInfoStep'
import PracticeQuestionRenderer from '@/components/practice/PracticeQuestionRenderer'
import { buildPracticeBriefingBubbles } from '@/lib/practice/practiceInstructionCopy'
import { LESSON_INPUT_GAP_PX, LESSON_SCROLL_GAP_REM } from '@/lib/lessonFeedScroll'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import type { Audience } from '@/lib/types'
import { showDebugQuestionIndex } from '@/lib/practice/debug'
import {
  getPracticeExerciseTypeCatalogNumber,
  PRACTICE_EXERCISE_TYPE_CATALOG_SIZE,
} from '@/lib/practice/practiceExerciseTypeCatalog'
import type { Bubble } from '@/types/lesson'
import type { PracticeMode, PracticeQuestion, PracticeSession } from '@/types/practice'

type PracticeMessage =
  | {
      id: string
      role: 'assistant'
      kind: 'lesson'
      bubbles: Bubble[]
      isHistorical: boolean
    }
  | {
      id: string
      role: 'user'
      kind: 'answer'
      text: string
    }
  | {
      id: string
      role: 'assistant'
      kind: 'status'
      text: string
      tone: 'service' | 'success' | 'error'
    }

interface PracticeScreenProps {
  session: PracticeSession
  audience?: Audience
  state: PracticeFlowState
  feedback?: { type: 'success' | 'error'; message: string } | null
  currentQuestion: PracticeQuestion | null
  canSubmit: boolean
  completionMeta?: {
    tier: 0 | 1 | 2
    globalAmount: number
    ringCount: number
    gemsPending: boolean
    cupClaimed: boolean
  } | null
  onSubmitAnswer: (answer: string) => void
  onNextQuestion: () => void
  onRepeat: () => void
  onStartMode: (mode: PracticeMode) => void
  onOpenLesson: () => void
  onBackToPracticeMenu: () => void
  onRetryAfterError?: () => void
  onAcknowledgeInstruction: () => void
  generationBusy?: boolean
}

const statusCardClassByTone: Record<'success' | 'error', string> = {
  success: 'border-green-200/90 bg-green-50/95 text-green-700',
  error: 'border-amber-200/90 bg-amber-50/95 text-amber-800',
}

function practiceTypeLabel(question: PracticeQuestion): string {
  if (question.type === 'choice') return 'Выберите лучший вариант.'
  if (question.type === 'voice-shadow') return 'Прослушайте и повторите фразу вслух.'
  if (question.type === 'dropdown-fill') return 'Восстановите пропуск.'
  if (question.type === 'listening-select') return 'Прослушайте и выберите правильный вариант.'
  if (question.type === 'sentence-surgery') return 'Соберите правильную фразу.'
  if (question.type === 'word-builder-pro') return 'Постройте фразу из слов.'
  if (question.type === 'dictation') return 'Напишите фразу на слух.'
  if (question.type === 'roleplay-mini') return 'Ответьте в мини-диалоге.'
  if (question.type === 'speed-round') return 'Быстрый раунд: отвечайте без долгих пауз.'
  if (question.type === 'boss-challenge') return 'Финальный вызов: примените тему целиком.'
  if (question.type === 'context-clue') return 'Найдите ответ по контексту.'
  return 'Ответьте самостоятельно.'
}

function normalizeInstruction(text: string | undefined): string {
  const trimmed = text?.trim() ?? ''
  if (!trimmed) return ''
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function practiceInfoLabel(question: PracticeQuestion): string {
  const hint = normalizeInstruction(question.hint)
  const base = normalizeInstruction(practiceTypeLabel(question))
  if (!hint) return base
  const normalizedHint = hint.toLowerCase().replace(/[.!?…]/g, '').replace(/\s+/g, ' ').trim()
  const normalizedBase = base.toLowerCase().replace(/[.!?…]/g, '').replace(/\s+/g, ' ').trim()
  if (normalizedHint === normalizedBase) return base
  return `${hint} ${base}`
}

function buildQuestionBubbles(params: {
  session: PracticeSession
  question: PracticeQuestion
  questionIndex: number
  previousWasCorrect: boolean | null
}): Bubble[] {
  const opening =
    params.questionIndex === 0
      ? `Начинаем практику по теме "${params.session.topic}". Первый шаг сделаем мягким.`
      : params.previousWasCorrect
        ? 'Предыдущий ответ засчитан. Держим темп.'
        : 'Ошибку уже разобрали. Теперь закрепим похожий паттерн.'
  return [
    { type: 'positive', content: opening },
    { type: 'info', content: practiceInfoLabel(params.question) },
    {
      type: 'task',
      content: showDebugQuestionIndex
        ? `шаг ${params.questionIndex + 1} · тип ${getPracticeExerciseTypeCatalogNumber(params.question.type)}/${PRACTICE_EXERCISE_TYPE_CATALOG_SIZE} (${params.question.type}) · ${params.question.prompt}`
        : params.question.prompt,
    },
  ]
}

function nextMode(mode: PracticeMode): PracticeMode {
  if (mode === 'reference') return 'challenge'
  if (mode === 'relaxed') return 'balanced'
  if (mode === 'balanced') return 'challenge'
  return 'challenge'
}

export default function PracticeScreen({
  session,
  audience = 'adult',
  state,
  feedback = null,
  currentQuestion,
  canSubmit,
  completionMeta = null,
  onSubmitAnswer,
  onNextQuestion,
  onRepeat,
  onStartMode,
  onOpenLesson,
  onBackToPracticeMenu,
  onRetryAfterError,
  onAcknowledgeInstruction,
  generationBusy = false,
}: PracticeScreenProps) {
  const INPUT_COMPOSER_PADDING_BOTTOM = `calc(var(--app-bottom-inset) + ${LESSON_SCROLL_GAP_REM}rem)`
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLDivElement | null>(null)
  const [composerHeight, setComposerHeight] = useState(0)

  const messages = useMemo<PracticeMessage[]>(() => {
    if (state === 'briefing') {
      return [
        {
          id: `practice-briefing-${session.id}`,
          role: 'assistant',
          kind: 'lesson',
          bubbles: buildPracticeBriefingBubbles(session, audience),
          isHistorical: false,
        },
      ]
    }

    const result: PracticeMessage[] = []
    const answersByQuestion = new Map<string, typeof session.answers>()
    session.answers.forEach((answer) => {
      const current = answersByQuestion.get(answer.questionId) ?? []
      answersByQuestion.set(answer.questionId, [...current, answer])
    })

    const visibleQuestions =
      session.status === 'completed'
        ? session.questions
        : session.questions.slice(0, Math.min(session.currentIndex + 1, session.questions.length))

    visibleQuestions.forEach((question, index) => {
      const answers = answersByQuestion.get(question.id) ?? []
      const previousAnswer = index > 0 ? answersByQuestion.get(session.questions[index - 1]?.id ?? '')?.at(-1) : null
      result.push({
        id: `practice-question-${question.id}`,
        role: 'assistant',
        kind: 'lesson',
        bubbles: buildQuestionBubbles({
          session,
          question,
          questionIndex: index,
          previousWasCorrect: previousAnswer ? previousAnswer.isCorrect : null,
        }),
        isHistorical: index < session.currentIndex || session.status === 'completed',
      })

      answers.forEach((answer, answerIndex) => {
        result.push({
          id: `practice-answer-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
          role: 'user',
          kind: 'answer',
          text: answer.userAnswer,
        })
        result.push({
          id: `practice-feedback-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
          role: 'assistant',
          kind: 'status',
          text:
            answer.feedbackMessage ??
            (answer.isCorrect
              ? answer.corrected
                ? 'Отлично, теперь правильно закреплено.'
                : 'Верно. Хороший ответ.'
              : `Почти. Правильный вариант: ${answer.correctAnswer}`),
          tone: answer.feedbackTone ?? (answer.isCorrect ? 'success' : 'error'),
        })
      })
    })

    if (state === 'checking' || state === 'generating_next') {
      result.push({
        id: state === 'checking' ? 'practice-checking' : 'practice-generating-next',
        role: 'assistant',
        kind: 'status',
        text: state === 'checking' ? 'Проверяем ответ...' : 'MyEng печатает...',
        tone: 'service',
      })
    }

    return result
  }, [session, state, audience])

  const tailMessageId = messages.at(-1)?.id ?? ''

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    if (state === 'briefing') {
      container.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [tailMessageId, messages.length, session.currentIndex, state])

  useEffect(() => {
    if (state === 'briefing') {
      setComposerHeight(0)
      return
    }

    const composer = composerRef.current
    if (!composer) {
      setComposerHeight(0)
      return
    }

    const syncComposerHeight = () => {
      const nextHeight = Math.round(composer.getBoundingClientRect().height)
      setComposerHeight((prev) => (prev === nextHeight ? prev : nextHeight))
    }

    syncComposerHeight()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      syncComposerHeight()
    })
    observer.observe(composer)
    return () => observer.disconnect()
  }, [state, currentQuestion?.id])

  const composerHeightCss = composerHeight > 0 ? `${composerHeight}px` : 'var(--chat-input-height)'
  const scrollBottomPadding =
    state === 'briefing'
      ? `calc(${LESSON_SCROLL_GAP_REM}rem + ${LESSON_INPUT_GAP_PX}px)`
      : `calc(${LESSON_SCROLL_GAP_REM}rem + ${composerHeightCss} + ${LESSON_INPUT_GAP_PX}px)`

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div
            className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
            style={{ boxShadow: 'var(--chat-shell-shadow)' }}
          >
            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3"
              style={{
                paddingBottom: scrollBottomPadding,
                scrollPaddingBottom: scrollBottomPadding,
              }}
            >
              <div>
                {messages.map((message, index) => {
                  const previousRole = messages[index - 1]?.role as BubbleRole | undefined
                  const nextRole = messages[index + 1]?.role as BubbleRole | undefined
                  const position = getBubblePosition(previousRole, message.role, nextRole)
                  const isBubbleEnd = position === 'solo' || position === 'last'

                  if (message.kind === 'lesson') {
                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="assistant"
                        position={position}
                        className={message.isHistorical ? '' : 'lesson-enter'}
                        rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                      >
                        <UnifiedLessonBubble
                          bubbles={message.bubbles}
                          animateSections={!message.isHistorical}
                        />
                      </ChatBubbleFrame>
                    )
                  }

                  if (message.kind === 'answer') {
                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="user"
                        position={position}
                        className="lesson-enter"
                        rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">{message.text}</p>
                      </ChatBubbleFrame>
                    )
                  }

                  if (message.tone === 'service') {
                    return (
                      <div key={message.id} className="lesson-enter mb-2.5 flex justify-start px-1">
                        <p dir="ltr" className="w-fit italic typing-indicator-text-shimmer">
                          {message.text}
                        </p>
                      </div>
                    )
                  }

                  return (
                    <ChatBubbleFrame
                      key={message.id}
                      role="assistant"
                      position={position}
                      className="lesson-enter"
                      rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                    >
                      <section
                        className={`lesson-enter chat-section-surface glass-surface rounded-xl border px-3 py-2 ${statusCardClassByTone[message.tone]}`}
                      >
                        <p className="whitespace-pre-line break-words text-[14px] leading-[1.45]">{message.text}</p>
                      </section>
                    </ChatBubbleFrame>
                  )
                })}
              </div>
            </div>

            <div
              ref={composerRef}
              className={`shrink-0 border-t border-[var(--chat-shell-border)] bg-transparent px-2.5 pt-2.5 sm:px-3 ${
                state === 'briefing' ? 'max-h-[48dvh] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]' : ''
              }`}
              style={{
                paddingBottom: INPUT_COMPOSER_PADDING_BOTTOM,
              }}
            >
              {state === 'completed' ? (
                <PracticeFinale
                  session={session}
                  tier={completionMeta?.tier}
                  globalAmount={completionMeta?.globalAmount}
                  ringCount={completionMeta?.ringCount}
                  gemsPending={completionMeta?.gemsPending}
                  cupClaimed={completionMeta?.cupClaimed}
                  onRepeat={onRepeat}
                  onChallenge={() => onStartMode(nextMode(session.mode))}
                  onOpenLesson={onOpenLesson}
                  onBackToPracticeMenu={onBackToPracticeMenu}
                  busy={generationBusy}
                />
              ) : state === 'error' ? (
                <div className="space-y-2">
                  <p className="px-1 text-center text-[13px] leading-snug text-amber-800">
                    {feedback?.message ?? 'Не удалось подготовить следующий шаг. Можно повторить безопасный вариант.'}
                  </p>
                  <button
                    type="button"
                    onClick={onRetryAfterError ?? onRepeat}
                    disabled={generationBusy}
                    className="btn-3d-menu w-full rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--status-info-text)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generationBusy ? 'Генерируем...' : 'Повторить безопасный вариант'}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToPracticeMenu}
                    className="w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-[var(--text-muted)]"
                  >
                    В меню практики
                  </button>
                </div>
              ) : state === 'briefing' ? (
                <PracticeInstructionFlowInfoStep
                  session={session}
                  audience={audience}
                  onContinue={onAcknowledgeInstruction}
                />
              ) : state === 'feedback' ? (
                <div className="space-y-1.5">
                  {session.mode === 'reference' ? (
                    <p className="px-1 text-center text-[12px] leading-snug text-[var(--text-muted)]">
                      MyEng готовит следующий шаг автоматически.
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onNextQuestion}
                        className="btn-3d-menu w-full rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--status-info-text)]"
                      >
                        {session.currentIndex >= session.questions.length - 1 ? 'Завершить практику' : 'Следующее задание'}
                      </button>
                      <p className="px-1 text-center text-[12px] leading-snug text-[var(--text-muted)]">
                        Переход выполнится автоматически через пару секунд — кнопка ускоряет шаг.
                      </p>
                    </>
                  )}
                </div>
              ) : currentQuestion ? (
                <PracticeQuestionRenderer
                  question={currentQuestion}
                  disabled={!canSubmit || state === 'checking'}
                  correctionMode={state === 'correction'}
                  audience={audience}
                  onSubmit={onSubmitAnswer}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
