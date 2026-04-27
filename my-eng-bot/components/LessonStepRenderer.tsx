'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import PostLessonMenu from '@/components/PostLessonMenu'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import type { BlockProgress, LessonStatus, LessonTimelineEntry } from '@/hooks/useLessonEngine'
import type { Bubble, PostLessonAction } from '@/types/lesson'

type LessonStepRendererProps = {
  timeline: LessonTimelineEntry[]
  status: LessonStatus
  blockProgress: BlockProgress
  onAnswer: (answer: string) => void
  onPostLessonAction?: (action: PostLessonAction) => void
  postLessonBusy?: boolean
  audience: 'child' | 'adult'
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
  timeline,
  status,
  blockProgress,
  onAnswer,
  onPostLessonAction,
  postLessonBusy = false,
  audience,
}: LessonStepRendererProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const reopenChoicesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [choiceResetVersion, setChoiceResetVersion] = useState(0)
  const currentEntry = timeline[timeline.length - 1] ?? null
  const currentStep = currentEntry?.step ?? null
  const currentFeedback = currentEntry?.feedback ?? null
  const exercise = currentStep?.exercise ?? null
  const postLesson = currentStep?.stepType === 'completion' ? currentStep.postLesson ?? null : null
  const choiceOptions = exercise?.options ?? []
  const hasChoiceOptions = choiceOptions.length > 0
  const hasPostLessonOptions = Boolean(postLesson?.options.length)
  const isChecking = status === 'checking'
  const inputPlaceholder = useMemo(() => {
    if (hasChoiceOptions) return 'Выберите вариант выше'
    return audience === 'child' ? 'Напиши пропущенное слово...' : 'Напишите пропущенное слово...'
  }, [audience, hasChoiceOptions])

  useEffect(() => {
    setInputValue('')
    setChoiceResetVersion((current) => current + 1)
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }
  }, [currentStep?.stepNumber])

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

  const submitTextAnswer = () => {
    if (!exercise || hasChoiceOptions || isChecking || !inputValue.trim()) return
    onAnswer(inputValue.trim())
  }

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
                      disabled
                      aria-label="Голосовой ввод пока недоступен в уроке"
                      title="Голосовой ввод пока недоступен в уроке"
                      className="chat-action-button chat-control-surface relative isolate flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full p-2.5 touch-manipulation text-[var(--chat-control-text)]"
                      style={{ background: 'var(--chat-control-bg)' }}
                    >
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
                      placeholder={inputPlaceholder}
                    />
                    <button
                      type="submit"
                      disabled={hasChoiceOptions || isChecking || !inputValue.trim()}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
