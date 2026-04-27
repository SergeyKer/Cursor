'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import PostLessonMenu from '@/components/PostLessonMenu'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import type { BlockProgress, LessonStatus, LessonTimelineEntry } from '@/hooks/useLessonEngine'
import { seededShuffle } from '@/lib/shuffleSeeded'
import { useLessonVoiceInput } from '@/lib/voice/useLessonVoiceInput'
import type { Bubble, PostLessonAction } from '@/types/lesson'

type LessonStepRendererProps = {
  timeline: LessonTimelineEntry[]
  status: LessonStatus
  blockProgress: BlockProgress
  onAnswer: (answer: string) => void
  onPostLessonAction?: (action: PostLessonAction) => void
  postLessonBusy?: boolean
  audience: 'child' | 'adult'
  /** Новый ключ (например `runKey` урока) — новый порядок вариантов в fill_choice на каждый проход. */
  choiceShuffleSeed?: string
}

type LessonMessage =
  | {
      id: string
      role: 'assistant'
      kind: 'lesson'
      bubbles: Bubble[]
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

const lessonSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'border-emerald-200/90 bg-white/95',
  info: 'border-[var(--chat-section-neutral-border)] bg-white/95',
  task: 'border-blue-200/90 bg-[rgba(239,246,255,0.96)]',
}

const lessonStatusCardClassByTone: Record<'service' | 'success' | 'error', string> = {
  service: 'border-[var(--chat-section-neutral-border)] bg-white/90 text-[var(--text-muted,#6b7280)]',
  success: 'border-green-200/90 bg-green-50/95 text-green-700',
  error: 'border-amber-200/90 bg-amber-50/95 text-amber-800',
}

const CHOICE_REOPEN_DELAY_MS = 900

function normalizeLessonChoiceText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

export default function LessonStepRenderer({
  timeline,
  status,
  blockProgress,
  onAnswer,
  onPostLessonAction,
  postLessonBusy = false,
  audience,
  choiceShuffleSeed,
}: LessonStepRendererProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const reopenChoicesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousVoicePhaseRef = useRef<'idle' | 'recording' | 'finalizing' | 'error'>('idle')
  const [choiceResetVersion, setChoiceResetVersion] = useState(0)
  const [autoSelectChoiceText, setAutoSelectChoiceText] = useState<string | null>(null)
  const [autoSelectChoiceNonce, setAutoSelectChoiceNonce] = useState(0)
  const currentEntry = timeline[timeline.length - 1] ?? null
  const currentStep = currentEntry?.step ?? null
  const currentFeedback = currentEntry?.feedback ?? null
  const exercise = currentStep?.exercise ?? null
  const postLesson = currentStep?.stepType === 'completion' ? currentStep.postLesson ?? null : null
  const rawChoiceOptions = exercise?.options
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
  const hasChoiceOptions = choiceOptions.length > 0
  const hasPostLessonOptions = Boolean(postLesson?.options.length)
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
  const canUseLessonVoiceInput = Boolean(exercise) && !hasPostLessonOptions && !isChecking
  const lessonVoiceInput = useLessonVoiceInput({
    inviteKey:
      canUseLessonVoiceInput && lessonInviteBubble
        ? `${currentStep?.stepNumber ?? 'step'}:${lessonInviteBubble.content}`
        : null,
  })
  const { resetVoiceInput } = lessonVoiceInput
  const inputValue = lessonVoiceInput.isInputLocked ? lessonVoiceInput.displayText : lessonVoiceInput.draftText
  const normalizedChoiceEntries = useMemo(
    () =>
      choiceOptions
        .map((choice) => choice.trim())
        .map((text) => ({ raw: text, normalized: normalizeLessonChoiceText(text) }))
        .filter((choice) => choice.raw),
    [choiceOptions]
  )
  const inputPlaceholder = useMemo(() => {
    if (hasChoiceOptions) {
      return audience === 'child' ? 'Скажи или выбери ответ выше...' : 'Скажите или выберите ответ выше...'
    }
    if (!exercise) return audience === 'child' ? 'Напиши ответ...' : 'Напишите ответ...'
    if (exercise.answerFormat === 'full_sentence') {
      return audience === 'child' ? 'Напиши предложение...' : 'Напишите предложение...'
    }
    if (exercise.answerFormat === 'single_word') {
      return audience === 'child' ? 'Напиши пропущенное слово...' : 'Напишите пропущенное слово...'
    }
    return audience === 'child' ? 'Напиши ответ...' : 'Напишите ответ...'
  }, [audience, hasChoiceOptions, exercise])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7359/ingest/af82526e-4aca-4df7-8f6b-d839f48f8a8e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9caaa4'},body:JSON.stringify({sessionId:'9caaa4',runId:'pre-fix',hypothesisId:'H6',location:'components/LessonStepRenderer.tsx:stepResetEffect',message:'step_reset_effect_run',data:{stepNumber:currentStep?.stepNumber,voicePhase:lessonVoiceInput.voicePhase,listening:lessonVoiceInput.listening,draftText:lessonVoiceInput.draftText},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setChoiceResetVersion((current) => current + 1)
    setAutoSelectChoiceText(null)
    resetVoiceInput()
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }
  }, [currentStep?.stepNumber, resetVoiceInput])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
  }, [timeline, status])

  useEffect(() => {
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }

    if (!hasChoiceOptions || currentFeedback?.type !== 'error') return

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
  }, [currentFeedback?.type, hasChoiceOptions, currentStep?.stepNumber])

  const triggerChoiceAutoSelect = useCallback(
    (choiceText: string) => {
      setAutoSelectChoiceText(choiceText)
      setAutoSelectChoiceNonce((current) => current + 1)
    },
    []
  )

  const submitTextAnswer = useCallback(() => {
    if (!exercise || isChecking || lessonVoiceInput.isInputLocked || !lessonVoiceInput.draftText.trim()) return
    if (hasChoiceOptions) {
      const normalizedInput = normalizeLessonChoiceText(lessonVoiceInput.draftText)
      const matchedChoice = normalizedChoiceEntries.find((choice) => choice.normalized === normalizedInput)
      if (!matchedChoice) return
      triggerChoiceAutoSelect(matchedChoice.raw)
      return
    }
    onAnswer(inputValue.trim())
  }, [
    exercise,
    hasChoiceOptions,
    inputValue,
    isChecking,
    lessonVoiceInput.draftText,
    lessonVoiceInput.isInputLocked,
    normalizedChoiceEntries,
    onAnswer,
    triggerChoiceAutoSelect,
  ])

  useEffect(() => {
    const previousPhase = previousVoicePhaseRef.current
    const currentPhase = lessonVoiceInput.voicePhase
    if (!hasChoiceOptions) return
    if (previousPhase !== 'finalizing' || currentPhase !== 'idle') return
    const normalizedInput = normalizeLessonChoiceText(lessonVoiceInput.draftText)
    if (!normalizedInput) return
    const matchedChoice = normalizedChoiceEntries.find((choice) => choice.normalized === normalizedInput)
    if (!matchedChoice) return
    triggerChoiceAutoSelect(matchedChoice.raw)
  }, [
    hasChoiceOptions,
    lessonVoiceInput.draftText,
    lessonVoiceInput.voicePhase,
    normalizedChoiceEntries,
    triggerChoiceAutoSelect,
  ])

  useEffect(() => {
    previousVoicePhaseRef.current = lessonVoiceInput.voicePhase
  }, [lessonVoiceInput.voicePhase])

  const lessonMessages = useMemo<LessonMessage[]>(() => {
    const messages: LessonMessage[] = []

    timeline.forEach((entry) => {
      const bubbles = entry.isCurrent
        ? entry.step.bubbles.slice(0, blockProgress.visibleCount)
        : entry.step.bubbles

      if (bubbles.length > 0) {
        messages.push({
          id: `lesson-${entry.step.stepNumber}`,
          role: 'assistant',
          kind: 'lesson',
          bubbles,
        })
      }

      if (entry.submittedAnswer?.trim()) {
        messages.push({
          id: `answer-${entry.step.stepNumber}`,
          role: 'user',
          kind: 'answer',
          text: entry.submittedAnswer.trim(),
        })
      }

      if (entry.isCurrent && status === 'checking' && entry.step.exercise) {
        messages.push({
          id: `checking-${entry.step.stepNumber}`,
          role: 'assistant',
          kind: 'status',
          text: 'Проверяем ответ...',
          tone: 'service',
        })
      }

      if (entry.feedback && (!entry.isCurrent || status === 'feedback')) {
        messages.push({
          id: `feedback-${entry.step.stepNumber}-${entry.feedback.type}`,
          role: 'assistant',
          kind: 'status',
          text: entry.feedback.message,
          tone: entry.feedback.type === 'success' ? 'success' : 'error',
        })
      }
    })

    return messages
  }, [timeline, blockProgress.visibleCount, status])

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
                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="assistant"
                        position={position}
                        rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                      >
                        <div className="space-y-1.5">
                          {message.bubbles.map((bubble, bubbleIndex) => (
                            <section
                              key={`${message.id}-${bubbleIndex}-${bubble.type}`}
                              className={`chat-section-surface glass-surface rounded-xl border px-3 py-2 ${lessonSectionClassByType[bubble.type]}`}
                            >
                              <p className="whitespace-pre-line break-words text-[15px] leading-[1.5] text-[var(--text)]">
                                {bubble.content}
                              </p>
                            </section>
                          ))}
                        </div>
                      </ChatBubbleFrame>
                    )
                  }

                  if (message.kind === 'answer') {
                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="user"
                        position={position}
                        rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                          {message.text}
                        </p>
                      </ChatBubbleFrame>
                    )
                  }

                  return (
                    <ChatBubbleFrame
                      key={message.id}
                      role="assistant"
                      position={position}
                      rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                    >
                      <section
                        className={`chat-section-surface glass-surface rounded-xl border px-3 py-2 ${lessonStatusCardClassByTone[message.tone]}`}
                      >
                        <p className="whitespace-pre-line break-words text-[14px] leading-[1.45]">{message.text}</p>
                      </section>
                    </ChatBubbleFrame>
                  )
                })}
              </div>
            </div>

            {(exercise || hasPostLessonOptions) && (
              <div
                className="shrink-0 border-t border-[var(--chat-shell-border)] bg-transparent px-2.5 pt-2.5 sm:px-3"
                style={{ paddingBottom: 'calc(var(--app-bottom-inset) + 0.625rem)' }}
              >
                {hasPostLessonOptions ? (
                  <PostLessonMenu
                    options={postLesson?.options ?? []}
                    onSelect={(action) => onPostLessonAction?.(action)}
                    disabled={postLessonBusy || !onPostLessonAction}
                  />
                ) : hasChoiceOptions ? (
                  <LessonChoiceChips
                    key={`choices-${currentStep?.stepNumber ?? 'none'}`}
                    choices={choiceOptions}
                    onChoose={onAnswer}
                    disabled={isChecking}
                    resetKey={`${currentStep?.stepNumber ?? 'none'}-${choiceResetVersion}`}
                    autoSelectText={autoSelectChoiceText}
                    autoSelectNonce={autoSelectChoiceNonce}
                  />
                ) : null}

                {!hasPostLessonOptions && (
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
                      disabled={lessonVoiceInput.voicePhase === 'finalizing'}
                      onClick={() => {
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
                      disabled={isChecking}
                      className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted,#6b7280)] disabled:cursor-not-allowed disabled:opacity-70"
                      placeholder={inputPlaceholder}
                    />
                    <button
                      type="submit"
                      disabled={
                        isChecking ||
                        lessonVoiceInput.isInputLocked ||
                        !lessonVoiceInput.draftText.trim() ||
                        (hasChoiceOptions &&
                          !normalizedChoiceEntries.some(
                            (choice) => choice.normalized === normalizeLessonChoiceText(lessonVoiceInput.draftText)
                          ))
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
                )}
                {lessonVoiceInput.voiceStatusMessage && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`px-1 pt-2 text-[13px] leading-[1.4] ${
                      lessonVoiceInput.voicePhase === 'error'
                        ? 'text-[var(--status-danger-text,#dc2626)]'
                        : 'text-[var(--text-muted,#6b7280)]'
                    }`}
                  >
                    {lessonVoiceInput.voiceStatusMessage}
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
