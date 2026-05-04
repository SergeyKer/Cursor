'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import LessonSentencePuzzle from '@/components/LessonSentencePuzzle'
import PostLessonMenu from '@/components/PostLessonMenu'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import VoiceComposerOverlay from '@/components/voice/VoiceComposerOverlay'
import type { BlockProgress, LessonStatus, LessonTimelineEntry } from '@/hooks/useLessonEngine'
import { getLessonSingleWordRuCue } from '@/lib/lessonSingleWordCue'
import { speak } from '@/lib/speech'
import { seededShuffle } from '@/lib/shuffleSeeded'
import { useLessonVoiceInput } from '@/lib/voice/useLessonVoiceInput'
import type { Bubble, PostLessonAction } from '@/types/lesson'

type LessonStepRendererProps = {
  timeline: LessonTimelineEntry[]
  status: LessonStatus
  blockProgress: BlockProgress
  exerciseErrors?: number
  onAnswer: (answer: string) => void
  onCompleteStep?: (options?: { submittedAnswer?: string; message?: string; xpAward?: number }) => void
  onPostLessonAction?: (action: PostLessonAction) => void
  postLessonBusy?: boolean
  audience: 'child' | 'adult'
  voiceId: string
  /** Новый ключ (например `runKey` урока) — новый порядок вариантов в fill_choice на каждый проход. */
  choiceShuffleSeed?: string
}

type LessonMessage =
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

const lessonStatusCardClassByTone: Record<'service' | 'success' | 'error', string> = {
  service: 'border-[var(--chat-section-neutral-border)] bg-white/90 text-[var(--text-muted,#6b7280)]',
  success: 'border-green-200/90 bg-green-50/95 text-green-700',
  error: 'border-amber-200/90 bg-amber-50/95 text-amber-800',
}

const CHOICE_REOPEN_DELAY_MS = 900
const LESSON_HIDDEN_VOICE_STATUS_MESSAGES = new Set([
  'Голосовой ввод...',
  '[Распознавание затянулось. Скажите короче или введите текст с клавиатуры (включая цифры и знаки).]',
])

function normalizeLessonChoiceText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeTranslatePromptPunctuation(text: string): string {
  return text.replace(/(Переведите на английский:\s*"[^"\n]*")([.!?…]+)/g, '$1')
}

function injectRussianSingleWordCue(question: string, exercise: LessonTimelineEntry['step']['exercise']): string {
  if (!exercise || exercise.answerFormat !== 'single_word') return question
  if (!/^Дополните одним словом:/i.test(question)) return question
  // Не дублируем, если подсказка уже встроена в вопрос.
  if (/^Дополните одним словом:\s*"[^"\n]+"\s*-\s*/i.test(question)) return question

  const ruHint = exercise.singleWordCueRu?.trim() || getLessonSingleWordRuCue(exercise.correctAnswer)
  if (!ruHint) return question

  const questionTailMatch = question.match(/^Дополните одним словом:\s*(.+)$/i)
  if (!questionTailMatch) return question
  return `Дополните одним словом: "${ruHint}" - ${questionTailMatch[1]}`
}

function injectVariantQuestionIntoTaskBubble(bubbles: Bubble[], exercise: LessonTimelineEntry['step']['exercise']): Bubble[] {
  if (!exercise?.variants || exercise.variants.length <= 1) return bubbles
  const question = normalizeTranslatePromptPunctuation(injectRussianSingleWordCue(exercise.question?.trim() ?? '', exercise))
  if (!question) return bubbles

  let taskBubbleIndex = -1
  for (let index = bubbles.length - 1; index >= 0; index -= 1) {
    if (bubbles[index]?.type === 'task') {
      taskBubbleIndex = index
      break
    }
  }
  if (taskBubbleIndex === -1) return bubbles
  if (bubbles[taskBubbleIndex].content.trim() === question) return bubbles

  const nextBubbles = [...bubbles]
  nextBubbles[taskBubbleIndex] = {
    ...nextBubbles[taskBubbleIndex],
    content: question,
  }
  return nextBubbles
}

function compactToTaskOnly(bubbles: Bubble[]): Bubble[] {
  const taskBubbles = bubbles.filter((bubble) => bubble.type === 'task')
  if (taskBubbles.length > 0) return taskBubbles
  const lastBubble = bubbles.at(-1)
  return lastBubble ? [lastBubble] : []
}

export default function LessonStepRenderer({
  timeline,
  status,
  blockProgress,
  exerciseErrors = 0,
  onAnswer,
  onCompleteStep,
  onPostLessonAction,
  postLessonBusy = false,
  audience,
  voiceId,
  choiceShuffleSeed,
}: LessonStepRendererProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const reopenChoicesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousVoicePhaseRef = useRef<'idle' | 'recording' | 'finalizing' | 'error'>('idle')
  const previousScrollSnapshotRef = useRef<{
    messageCount: number
    stepNumber: number
    variantIndex: number
    /** Последнее сообщение в ленте (id), чтобы ловить смену «Проверяем…» → feedback при том же числе сообщений */
    tailMessageId: string
  } | null>(null)
  const [choiceResetVersion, setChoiceResetVersion] = useState(0)
  const currentEntry = timeline[timeline.length - 1] ?? null
  const currentStep = currentEntry?.step ?? null
  const currentFeedback = currentEntry?.feedback ?? null
  const latestFeedback = useMemo(
    () =>
      [...timeline]
        .reverse()
        .map((entry) => entry.feedback)
        .find((feedback): feedback is NonNullable<typeof feedback> => feedback !== null) ?? null,
    [timeline]
  )
  const exercise = currentStep?.exercise ?? null
  const currentVariantIndex = exercise?.currentVariantIndex ?? 0
  const postLesson = currentStep?.stepType === 'completion' ? currentStep.postLesson ?? null : null
  const rawChoiceOptions = exercise?.options
  const isSentencePuzzle = exercise?.type === 'sentence_puzzle'
  const isChoiceExercise = exercise?.type === 'fill_choice' || exercise?.type === 'micro_quiz'
  const choiceOptions = useMemo(() => {
    const opts = rawChoiceOptions ?? []
    if (
      !exercise ||
      exercise.type !== 'fill_choice' ||
      opts.length < 2 ||
      !choiceShuffleSeed?.trim()
    ) {
      return opts
    }
    return seededShuffle(opts, `${choiceShuffleSeed}:step${currentStep?.stepNumber ?? 0}`)
  }, [choiceShuffleSeed, currentStep?.stepNumber, exercise, rawChoiceOptions])
  const hasChoiceOptions = isChoiceExercise && choiceOptions.length > 0
  const shouldRenderChoiceChips = hasChoiceOptions
  const hasPostLessonOptions = Boolean(postLesson?.options.length)
  const isChoiceDrivenStep = shouldRenderChoiceChips || hasPostLessonOptions || isSentencePuzzle
  const isTextInputAvailable = Boolean(exercise) && !hasPostLessonOptions && !shouldRenderChoiceChips && !isSentencePuzzle
  const isChecking = status === 'checking'
  const lessonInviteBubble = useMemo(() => {
    if (!currentEntry?.isCurrent) return null
    const visibleBubbles = currentEntry.step.bubbles.slice(0, blockProgress.visibleCount)
    for (let index = visibleBubbles.length - 1; index >= 0; index -= 1) {
      const bubble = visibleBubbles[index]
      if (bubble?.type === 'task') return bubble
    }
    return null
  }, [blockProgress.visibleCount, currentEntry])
  const canUseLessonVoiceInput = Boolean(exercise) && !hasPostLessonOptions && !isChecking && !shouldRenderChoiceChips && !isSentencePuzzle
  const lessonVoiceInput = useLessonVoiceInput({
    inviteKey:
      canUseLessonVoiceInput && lessonInviteBubble
        ? `${currentStep?.stepNumber ?? 'step'}:${lessonInviteBubble.content}`
        : null,
  })
  const { resetVoiceInput } = lessonVoiceInput
  const inputValue =
    lessonVoiceInput.isInputLocked && LESSON_HIDDEN_VOICE_STATUS_MESSAGES.has(lessonVoiceInput.displayText)
      ? ''
      : lessonVoiceInput.isInputLocked
        ? lessonVoiceInput.displayText
        : lessonVoiceInput.draftText
  const showVoiceOverlay = lessonVoiceInput.isVoiceActive && lessonVoiceInput.livePreviewText.length > 0
  const showVoicePlaybackButton =
    isTextInputAvailable &&
    !lessonVoiceInput.isVoiceActive &&
    !isChecking &&
    Boolean(lessonVoiceInput.lastCommittedVoiceText) &&
    lessonVoiceInput.draftText.trim() === lessonVoiceInput.lastCommittedVoiceText
  const rawVoiceStatusMessage = lessonVoiceInput.voiceStatusMessage ?? ''
  const voiceStatusMessage = LESSON_HIDDEN_VOICE_STATUS_MESSAGES.has(rawVoiceStatusMessage)
    ? ''
    : rawVoiceStatusMessage
  const inputPlaceholder = useMemo(() => {
    if (!exercise) return 'Напиши ответ...'
    if (exercise.answerFormat === 'full_sentence') {
      return 'Напиши предложение...'
    }
    if (exercise.answerFormat === 'single_word') {
      return 'Напиши пропущенное слово...'
    }
    return 'Напиши ответ...'
  }, [exercise])

  useEffect(() => {
    setChoiceResetVersion((current) => current + 1)
    resetVoiceInput()
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }
  }, [currentStep?.stepNumber, currentVariantIndex, resetVoiceInput])

  useEffect(() => {
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }

    if (!shouldRenderChoiceChips || latestFeedback?.type !== 'error') return

    reopenChoicesTimerRef.current = setTimeout(() => {
      setChoiceResetVersion((current) => current + 1)
      reopenChoicesTimerRef.current = null
    }, CHOICE_REOPEN_DELAY_MS)

    return () => {
      if (reopenChoicesTimerRef.current) {
        clearTimeout(reopenChoicesTimerRef.current)
        reopenChoicesTimerRef.current = null
      }
    }
  }, [latestFeedback?.type, exerciseErrors, shouldRenderChoiceChips, currentStep?.stepNumber])

  const submitTextAnswer = useCallback(() => {
    if (!exercise || !isTextInputAvailable || isChecking || lessonVoiceInput.isInputLocked || !lessonVoiceInput.draftText.trim()) return
    onAnswer(inputValue.trim())
  }, [
    exercise,
    inputValue,
    isTextInputAvailable,
    isChecking,
    lessonVoiceInput.draftText,
    lessonVoiceInput.isInputLocked,
    onAnswer,
  ])

  useEffect(() => {
    previousVoicePhaseRef.current = lessonVoiceInput.voicePhase
  }, [lessonVoiceInput.voicePhase])

  const lessonMessages = useMemo<LessonMessage[]>(() => {
    const messages: LessonMessage[] = []
    const seenAttemptCountByStep = new Map<number, number>()
    const attemptOrdinalByEntryIndex = new Map<number, number>()

    timeline.forEach((entry, entryIndex) => {
      if (!entry.step.exercise) return
      const nextAttemptOrdinal = (seenAttemptCountByStep.get(entry.stepIndex) ?? 0) + 1
      seenAttemptCountByStep.set(entry.stepIndex, nextAttemptOrdinal)
      attemptOrdinalByEntryIndex.set(entryIndex, nextAttemptOrdinal)
    })

    timeline.forEach((entry, entryIndex) => {
      const messageBaseId = `${entry.step.stepNumber}-${entry.stepIndex}-${entryIndex}-${entry.isCurrent ? 'current' : 'history'}`
      const shouldHideCurrentLessonBubbles =
        entry.isCurrent &&
        status === 'feedback' &&
        latestFeedback?.type === 'success'
      const baseBubbles = shouldHideCurrentLessonBubbles
        ? []
        : entry.isCurrent
          ? entry.step.bubbles.slice(0, blockProgress.visibleCount)
          : entry.step.bubbles
      const bubblesWithVariantQuestion = injectVariantQuestionIntoTaskBubble(baseBubbles, entry.step.exercise)
      const attemptOrdinal = attemptOrdinalByEntryIndex.get(entryIndex) ?? 0
      const isRepeatAttempt = attemptOrdinal > 1
      const isThreePartLessonBlock = bubblesWithVariantQuestion.length === 3
      const shouldCompactToTaskOnly = isRepeatAttempt && isThreePartLessonBlock
      const bubbles = shouldCompactToTaskOnly
        ? compactToTaskOnly(bubblesWithVariantQuestion)
        : bubblesWithVariantQuestion

      if (bubbles.length > 0) {
        messages.push({
          id: `lesson-${messageBaseId}`,
          role: 'assistant',
          kind: 'lesson',
          bubbles,
          isHistorical: !entry.isCurrent,
        })
      }

      if (entry.submittedAnswer?.trim()) {
        messages.push({
          id: `answer-${messageBaseId}`,
          role: 'user',
          kind: 'answer',
          text: entry.submittedAnswer.trim(),
        })
      }

      if (entry.isCurrent && status === 'checking' && entry.step.exercise) {
        messages.push({
          id: `checking-${messageBaseId}`,
          role: 'assistant',
          kind: 'status',
          text: 'Проверяем ответ...',
          tone: 'service',
        })
      }

      if (entry.feedback && (!entry.isCurrent || status === 'feedback')) {
        const feedbackText =
          entry.feedback.type === 'error' && entry.step.exercise
            ? `${entry.feedback.message}\nСкажи: ${entry.step.exercise?.correctAnswer ?? ''}`.trim()
            : entry.feedback.message
        messages.push({
          id: `feedback-${messageBaseId}-${entry.feedback.type}`,
          role: 'assistant',
          kind: 'status',
          text: feedbackText,
          tone: entry.feedback.type === 'success' ? 'success' : 'error',
        })
      }
    })

    return messages
  }, [timeline, blockProgress.visibleCount, status, latestFeedback?.type])

  const tailLessonMessageId = lessonMessages.at(-1)?.id ?? ''

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const nextSnapshot = {
      messageCount: lessonMessages.length,
      stepNumber: currentStep?.stepNumber ?? -1,
      variantIndex: currentVariantIndex,
      tailMessageId: tailLessonMessageId,
    }
    const previousSnapshot = previousScrollSnapshotRef.current

    if (previousSnapshot === null) {
      previousScrollSnapshotRef.current = nextSnapshot
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'auto' })
      return
    }

    const stepOrVariantChanged =
      previousSnapshot.stepNumber !== nextSnapshot.stepNumber ||
      previousSnapshot.variantIndex !== nextSnapshot.variantIndex
    const messageCountIncreased = nextSnapshot.messageCount > previousSnapshot.messageCount
    const tailChanged = previousSnapshot.tailMessageId !== nextSnapshot.tailMessageId

    if (!stepOrVariantChanged && !messageCountIncreased && !tailChanged) {
      previousScrollSnapshotRef.current = nextSnapshot
      return
    }

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: stepOrVariantChanged ? 'auto' : 'smooth',
    })
    previousScrollSnapshotRef.current = nextSnapshot
  }, [lessonMessages.length, currentStep?.stepNumber, currentVariantIndex, tailLessonMessageId])

  useEffect(() => {
    if (status !== 'feedback' || !latestFeedback) return
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    // После смены статуса высота ленты может догрузиться на следующем кадре (мультистрочный feedback,
    // скрытие блока урока и т.д.) — повторяем доскролл, чтобы карточка не обрезалась над композером.
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'auto' })
      })
    })
    return () => {
      cancelAnimationFrame(outerRaf)
      if (innerRaf) cancelAnimationFrame(innerRaf)
    }
  }, [status, latestFeedback, lessonMessages.length, tailLessonMessageId])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div
            className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
            style={{ boxShadow: 'var(--chat-shell-shadow)' }}
          >
            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3"
            >
              <div>
                {lessonMessages.map((message, index) => {
                  const previousRole = lessonMessages[index - 1]?.role as BubbleRole | undefined
                  const nextRole = lessonMessages[index + 1]?.role as BubbleRole | undefined
                  const position = getBubblePosition(previousRole, message.role, nextRole)
                  const isBubbleEnd = position === 'solo' || position === 'last'

                  if (message.kind === 'lesson') {
                    const shouldAnimateLessonMessage = !message.isHistorical

                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="assistant"
                        position={position}
                        className={shouldAnimateLessonMessage ? 'lesson-enter' : ''}
                        rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                      >
                        <UnifiedLessonBubble bubbles={message.bubbles} animateSections={shouldAnimateLessonMessage} />
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
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                          {message.text}
                        </p>
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
                        className={`lesson-enter chat-section-surface glass-surface rounded-xl border px-3 py-2 ${lessonStatusCardClassByTone[message.tone]}`}
                      >
                        <p className="whitespace-pre-line break-words text-[14px] leading-[1.45]">{message.text}</p>
                      </section>
                    </ChatBubbleFrame>
                  )
                })}
              </div>
            </div>

            {currentStep && (
              <div
                className={`shrink-0 border-t border-[var(--chat-shell-border)] bg-transparent px-2.5 sm:px-3 ${
                  shouldRenderChoiceChips ? 'pt-1' : 'pt-2.5'
                }`}
                style={{ paddingBottom: 'calc(var(--app-bottom-inset) + 0.375rem)' }}
              >
                {hasPostLessonOptions ? (
                  <PostLessonMenu
                    options={postLesson?.options ?? []}
                    onSelect={(action) => onPostLessonAction?.(action)}
                    disabled={postLessonBusy || !onPostLessonAction}
                  />
                ) : isSentencePuzzle && exercise ? (
                  <LessonSentencePuzzle
                    key={`sentence-puzzle-${choiceShuffleSeed ?? 'static'}-${currentStep?.stepNumber ?? 'step'}`}
                    exercise={exercise}
                    disabled={isChecking || !onCompleteStep}
                    progressKey={`${choiceShuffleSeed ?? 'static'}:${currentStep?.stepNumber ?? 'step'}:${currentVariantIndex}`}
                    onComplete={(summary) =>
                      onCompleteStep?.({
                        submittedAnswer: summary.submittedAnswer,
                        message: summary.message,
                        xpAward: exercise.bonusXp ?? 30,
                      })
                    }
                  />
                ) : shouldRenderChoiceChips ? (
                  <LessonChoiceChips
                    key={`choices-${currentStep?.stepNumber ?? 'none'}-${currentVariantIndex}`}
                    choices={choiceOptions}
                    onChoose={onAnswer}
                    disabled={isChecking}
                    resetKey={`${currentStep?.stepNumber ?? 'none'}-${currentVariantIndex}-${choiceResetVersion}`}
                  />
                ) : null}

                {exercise && !hasPostLessonOptions && !shouldRenderChoiceChips && !isSentencePuzzle ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      submitTextAnswer()
                    }}
                    className="glass-surface flex w-full items-center gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-1.5 sm:px-3"
                    style={{ boxShadow: 'var(--chat-composer-shadow)' }}
                  >
                    <button
                      type="button"
                      disabled={!isTextInputAvailable || lessonVoiceInput.voicePhase === 'finalizing'}
                      onClick={() => {
                        if (!isTextInputAvailable) return
                        lessonVoiceInput.resetMicAnimation()
                        if (lessonVoiceInput.listening) {
                          lessonVoiceInput.stopListening()
                          return
                        }
                        void lessonVoiceInput.startListening()
                      }}
                      aria-label={
                        lessonVoiceInput.listening
                          ? 'Остановить запись'
                          : lessonVoiceInput.voicePhase === 'finalizing'
                            ? 'Распознаю речь'
                            : 'Голосовой ввод'
                      }
                      title={
                        lessonVoiceInput.listening
                          ? 'Остановить'
                          : lessonVoiceInput.voicePhase === 'finalizing'
                            ? 'Распознаю речь'
                            : 'Голосовой ввод'
                      }
                      className={`chat-action-button chat-control-surface relative isolate flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full p-2.5 touch-manipulation ${
                        lessonVoiceInput.micActionActive
                          ? 'text-[var(--chat-control-active-text)]'
                          : 'text-[var(--chat-control-text)]'
                      }`}
                      style={{
                        background: lessonVoiceInput.micActionActive
                          ? 'var(--chat-control-active-bg)'
                          : 'var(--chat-control-bg)',
                        boxShadow: lessonVoiceInput.micActionActive ? 'var(--chat-control-shadow)' : undefined,
                      }}
                      onMouseEnter={(event) => {
                        if (!lessonVoiceInput.micActionActive) {
                          event.currentTarget.style.background = 'var(--chat-control-hover)'
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!lessonVoiceInput.micActionActive) {
                          event.currentTarget.style.background = 'var(--chat-control-bg)'
                        }
                      }}
                    >
                      {lessonVoiceInput.micActionActive ? (
                        <span className="relative z-10 h-5 w-5 rounded-full bg-[var(--chat-control-dot)]" />
                      ) : (
                        <span className="relative z-10">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
                            <path d="M19 11a7 7 0 0 1-14 0" />
                            <path d="M12 18v3" />
                            <path d="M8 21h8" />
                          </svg>
                        </span>
                      )}
                    </button>
                    <div className="relative isolate min-w-0 flex-1">
                      {showVoiceOverlay && (
                        <VoiceComposerOverlay
                          draftBeforeVoiceText=""
                          livePreviewText={lessonVoiceInput.livePreviewText}
                          webTextMetricsFix
                        />
                      )}
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(event) => lessonVoiceInput.setDraftText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            submitTextAnswer()
                          }
                        }}
                        readOnly={lessonVoiceInput.isInputLocked}
                        disabled={!isTextInputAvailable || isChecking}
                        className={`chat-input-field lesson-chat-input-field min-w-0 w-full rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2 min-h-[44px] text-base leading-[1.45rem] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70 ${
                          showVoicePlaybackButton ? 'pr-12' : ''
                        } ${
                          showVoiceOverlay ? 'chat-input-voice-web-metrics' : ''
                        } ${
                          showVoiceOverlay
                            ? 'text-transparent caret-transparent placeholder:text-transparent'
                            : 'text-[var(--text)]'
                        }`}
                        placeholder={inputPlaceholder}
                      />
                      {showVoicePlaybackButton && (
                        <div className="pointer-events-none absolute inset-y-0 right-2 z-10 flex items-center">
                          <button
                            type="button"
                            onClick={() => speak(lessonVoiceInput.lastCommittedVoiceText, voiceId)}
                            className="chat-input-inline-speaker-button chat-action-button pointer-events-auto inline-flex h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 shrink-0 items-center justify-center rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] text-[var(--chat-speaker-text)]"
                            title="Прослушать"
                            aria-label="Прослушать распознанный текст"
                          >
                            <LessonSpeakerIcon />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={
                        !isTextInputAvailable ||
                        isChecking ||
                        lessonVoiceInput.isInputLocked ||
                        !lessonVoiceInput.draftText.trim()
                      }
                      aria-label="Отправить ответ"
                      className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)]"
                      style={{ background: '#3B82F6' }}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-7 w-7"
                        fill="none"
                      >
                        <path
                          d="M21.4 11.6C21.7 11.8 21.7 12.2 21.4 12.4L5.9 19.4C5.2 19.7 4.4 19.2 4.5 18.4L5.3 14.2C5.4 13.9 5.6 13.6 5.9 13.5L12.8 12L5.9 10.5C5.6 10.4 5.4 10.1 5.3 9.8L4.5 5.6C4.4 4.8 5.2 4.3 5.9 4.6L21.4 11.6Z"
                          stroke="#FFFFFF"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </form>
                ) : null}
                {voiceStatusMessage && exercise && !hasPostLessonOptions && !shouldRenderChoiceChips && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`px-1 pt-2 text-[13px] leading-[1.4] ${
                      lessonVoiceInput.voicePhase === 'error'
                        ? 'text-[var(--status-danger-text,#dc2626)]'
                        : 'text-[var(--text-muted,#6b7280)]'
                    }`}
                  >
                    {voiceStatusMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LessonSpeakerIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  )
}
