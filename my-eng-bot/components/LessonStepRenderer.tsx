'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import type { BlockProgress, LessonFeedback, LessonStatus } from '@/hooks/useLessonEngine'
import type { Bubble, LessonStep } from '@/types/lesson'

type LessonStepRendererProps = {
  step: LessonStep
  status: LessonStatus
  feedback: LessonFeedback | null
  submittedAnswer: string | null
  blockProgress: BlockProgress
  onAnswer: (answer: string) => void
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

export default function LessonStepRenderer({
  step,
  status,
  feedback,
  submittedAnswer,
  blockProgress,
  onAnswer,
}: LessonStepRendererProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const reopenChoicesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [choiceResetVersion, setChoiceResetVersion] = useState(0)
  const visibleBubbles = step.bubbles.slice(0, blockProgress.visibleCount)
  const exercise = step.exercise ?? null
  const choiceOptions = exercise?.options ?? []
  const hasChoiceOptions = choiceOptions.length > 0
  const isChecking = status === 'checking'
  const helperText = useMemo(() => {
    if (!exercise) return null
    if (hasChoiceOptions) return 'Выберите вариант выше.'
    return exercise.question || 'Напишите ответ внизу.'
  }, [exercise, hasChoiceOptions])

  useEffect(() => {
    setInputValue('')
    setChoiceResetVersion((current) => current + 1)
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }
  }, [step.stepNumber])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step.stepNumber])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    if (submittedAnswer || status === 'checking' || feedback) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
    }
  }, [submittedAnswer, status, feedback])

  useEffect(() => {
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }

    if (!hasChoiceOptions || feedback?.type !== 'error') return

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
  }, [feedback?.type, hasChoiceOptions, step.stepNumber])

  const submitTextAnswer = () => {
    if (!exercise || hasChoiceOptions || isChecking || !inputValue.trim()) return
    onAnswer(inputValue.trim())
  }

  const lessonMessages = useMemo<LessonMessage[]>(() => {
    const messages: LessonMessage[] = []

    if (visibleBubbles.length > 0) {
      messages.push({
        id: `lesson-${step.stepNumber}`,
        role: 'assistant',
        kind: 'lesson',
        bubbles: visibleBubbles,
      })
    }

    if (submittedAnswer?.trim()) {
      messages.push({
        id: `answer-${step.stepNumber}`,
        role: 'user',
        kind: 'answer',
        text: submittedAnswer.trim(),
      })
    }

    if (status === 'checking' && exercise) {
      messages.push({
        id: `checking-${step.stepNumber}`,
        role: 'assistant',
        kind: 'status',
        text: 'Проверяем ответ...',
        tone: 'service',
      })
    }

    if (feedback && status === 'feedback') {
      messages.push({
        id: `feedback-${step.stepNumber}-${feedback.type}`,
        role: 'assistant',
        kind: 'status',
        text: feedback.message,
        tone: feedback.type === 'success' ? 'success' : 'error',
      })
    }

    return messages
  }, [exercise, feedback, status, step.stepNumber, submittedAnswer, visibleBubbles])

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
                        <div className="space-y-2">
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

            {exercise && (
              <div
                className="shrink-0 border-t border-[var(--chat-shell-border)] bg-transparent px-2.5 pt-2.5 sm:px-3"
                style={{ paddingBottom: 'calc(var(--app-bottom-inset) + 0.625rem)' }}
              >
                {hasChoiceOptions && (
                  <LessonChoiceChips
                    key={`choices-${step.stepNumber}`}
                    choices={choiceOptions}
                    onChoose={onAnswer}
                    disabled={isChecking}
                    resetKey={`${step.stepNumber}-${choiceResetVersion}`}
                  />
                )}

                <div className="px-2 pb-2 text-center text-sm text-[var(--text-muted,#6b7280)]">{helperText}</div>

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
                    disabled
                    aria-label="Голосовой ввод пока недоступен в уроке"
                    title="Голосовой ввод пока недоступен в уроке"
                    className="chat-action-button chat-control-surface flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2.5 text-[var(--chat-control-text)] opacity-50"
                  >
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
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitTextAnswer()
                      }
                    }}
                    disabled={isChecking || hasChoiceOptions}
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted,#6b7280)] disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder={hasChoiceOptions ? 'Выберите вариант выше' : 'Reply...'}
                  />
                  <button
                    type="submit"
                    disabled={hasChoiceOptions || isChecking || !inputValue.trim()}
                    aria-label="Отправить ответ"
                    className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)] disabled:opacity-60"
                    style={{ background: '#3B82F6' }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m4 12 14-7-3 7 3 7-14-7Z" />
                    </svg>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
