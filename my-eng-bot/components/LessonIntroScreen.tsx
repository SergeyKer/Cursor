'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import type { AiProvider, Audience, OpenAiChatPreset } from '@/lib/types'
import type { Bubble, LessonIntro } from '@/types/lesson'

export type LessonIntroDepth = 'quick' | 'details' | 'deep'

type LessonIntroScreenProps = {
  intro: LessonIntro
  depth: LessonIntroDepth
  loadingLesson?: boolean
  provider: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience: Audience
  onShowDetails: () => void
  onShowDeepDive: () => void
  onStartLesson: () => void
  onShowExtras: () => void
  onBack: () => void
}

type IntroMessage = {
  id: string
  role: 'assistant'
  bubbles: Bubble[]
}

type IntroUserMessage = {
  id: string
  role: 'user'
  text: string
}

type IntroChatMessage = IntroMessage | IntroUserMessage

const INTRO_FOLLOWUP_DELAY_MS = 520
const INTRO_CHAT_ANCHOR_OFFSET_PX = -4

function formatList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n')
}

function formatExamples(examples: LessonIntro['quick']['examples']): string {
  return examples.map((example) => `✓ ${example.en} → ${example.ru} (${example.note})`).join('\n')
}

function formatPracticeMission(intro: LessonIntro): string {
  const goal = intro.learningPlan?.firstPracticeGoal ?? intro.quick.takeaway
  const example = intro.details?.examples?.[0] ?? intro.quick.examples[0]
  const trap = intro.deepDive?.commonMistakes[0]
  const lines = [`🎯 Миссия: ${goal}`]

  if (example) {
    lines.push(`🧭 Ориентир: ${example.en} (${example.note})`)
  }

  if (trap) {
    lines.push(`⚠️ Ловушка: ${trap}`)
  }

  return lines.join('\n')
}

function buildQuickBubbles(intro: LessonIntro): [Bubble, Bubble, Bubble] {
  return [
    {
      type: 'positive',
      content: `🟡 ТЕОРИЯ\n${formatList(intro.quick.why)}`,
    },
    {
      type: 'info',
      content: `⚪ КАК РАБОТАЕТ\n${formatList(intro.quick.how)}`,
    },
    {
      type: 'task',
      content: `🟢 ПРИМЕРЫ И ВЫВОД\n${formatExamples(intro.quick.examples)}\n\n${intro.quick.takeaway}`,
    },
  ]
}

function buildDetailsBubbles(intro: LessonIntro): [Bubble, Bubble, Bubble] | null {
  if (!intro.details) return null
  return [
    {
      type: 'positive',
      content: `🔎 ПОЧЕМУ ТАК\n${formatList(intro.details.points)}`,
    },
    {
      type: 'info',
      content: intro.details.examples?.length
        ? `⚪ ЕЩЕ ПРИМЕРЫ\n${formatExamples(intro.details.examples)}`
        : '⚪ ЕЩЕ ПРИМЕРЫ\nПосмотрите на правило в коротких фразах, не в длинной таблице.',
    },
    {
      type: 'task',
      content: `🟢 МИНИ-МИССИЯ\n${formatPracticeMission(intro)}`,
    },
  ]
}

function buildDeepDiveBubbles(intro: LessonIntro): [Bubble, Bubble, Bubble] | null {
  if (!intro.deepDive) return null
  return [
    {
      type: 'positive',
      content: `🔬 ЧАСТЫЕ ОШИБКИ\n${formatList(intro.deepDive.commonMistakes)}`,
    },
    {
      type: 'info',
      content: intro.deepDive.contrastNotes?.length
        ? `⚪ НЮАНСЫ\n${formatList(intro.deepDive.contrastNotes)}`
        : '⚪ НЮАНСЫ\nСравнивайте похожие формы по смыслу, а не только по внешнему виду.',
    },
    {
      type: 'task',
      content: `🟢 САМОПРОВЕРКА\n${intro.deepDive.selfCheckRule}`,
    },
  ]
}

function buildExtraDeepDiveFallback(intro: LessonIntro, index: number): [Bubble, Bubble, Bubble] {
  const example = intro.details?.examples?.[index % (intro.details.examples.length || 1)] ?? intro.quick.examples[index % intro.quick.examples.length]
  const mistake = intro.deepDive?.commonMistakes[index % (intro.deepDive.commonMistakes.length || 1)]
  const contrast = intro.deepDive?.contrastNotes?.[index % intro.deepDive.contrastNotes.length]
  const focus = intro.learningPlan?.grammarFocus[index % (intro.learningPlan.grammarFocus.length || 1)]

  return [
    {
      type: 'positive',
      content: `🔬 ЧАСТЫЕ ОШИБКИ\n• ${mistake ?? intro.quick.takeaway}\n• Слишком быстро выбирать форму без смысла: ${focus ?? intro.topic}.\n• Забывать сверить пример: ${example.en}`,
    },
    {
      type: 'info',
      content: contrast
        ? `⚪ НЮАНСЫ\n• ${contrast}\n• Ориентир: ${example.en} → ${example.ru}\n• Сначала назови смысл, потом выбери форму.`
        : `⚪ НЮАНСЫ\n• Ориентир: ${example.en} → ${example.ru}\n• Не учи правило отдельно от ситуации.\n• Короткий пример лучше длинного объяснения.`,
    },
    {
      type: 'task',
      content: `🟢 САМОПРОВЕРКА\n${intro.deepDive?.selfCheckRule ?? intro.quick.takeaway}`,
    },
  ]
}

function IntroChip({
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'link' | 'tips' | 'deep'
}) {
  const className =
    variant === 'primary'
      ? 'inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60'
      : variant === 'link'
        ? 'inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-600 shadow-sm transition hover:from-white hover:to-sky-100 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60'
        : variant === 'tips'
          ? 'inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-100 px-2.5 py-2 text-center text-[13px] font-semibold text-amber-800 shadow-sm transition hover:from-amber-100 hover:to-yellow-200 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60'
          : variant === 'deep'
            ? 'inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-violet-200 bg-gradient-to-r from-violet-100 to-indigo-100 px-2.5 py-2 text-center text-[13px] font-semibold text-violet-800 shadow-sm transition hover:from-violet-200 hover:to-indigo-200 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60'
          : 'inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-sky-200 bg-gradient-to-r from-cyan-50 to-blue-100 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-700 shadow-sm transition hover:from-cyan-100 hover:to-blue-200 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

export default function LessonIntroScreen({
  intro,
  depth,
  loadingLesson = false,
  provider,
  openAiChatPreset,
  audience,
  onShowDetails,
  onShowDeepDive,
  onStartLesson,
  onShowExtras,
  onBack,
}: LessonIntroScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const followupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [pendingDepth, setPendingDepth] = useState<Exclude<LessonIntroDepth, 'quick'> | null>(null)
  const [extraDeepDives, setExtraDeepDives] = useState<Bubble[][]>([])
  const [extraDeepDiveLoading, setExtraDeepDiveLoading] = useState(false)
  const messages = useMemo<IntroChatMessage[]>(() => {
    const next: IntroChatMessage[] = [{ id: 'quick', role: 'assistant', bubbles: buildQuickBubbles(intro) }]
    const details = buildDetailsBubbles(intro)
    const shouldShowDetailsRequest = pendingDepth === 'details' || pendingDepth === 'deep' || depth === 'details' || depth === 'deep'
    const shouldShowDetailsAnswer = depth === 'details' || depth === 'deep'
    if (details && shouldShowDetailsRequest) {
      next.push({ id: 'details-request', role: 'user', text: 'Подробнее' })
    }
    if (details && shouldShowDetailsAnswer) {
      next.push({ id: 'details', role: 'assistant', bubbles: details })
    }
    const deepDive = buildDeepDiveBubbles(intro)
    const shouldShowDeepRequest = pendingDepth === 'deep' || depth === 'deep'
    if (deepDive && shouldShowDeepRequest) {
      next.push({ id: 'deep-request', role: 'user', text: 'Еще подробнее' })
    }
    if (depth === 'deep' && deepDive) {
      next.push({ id: 'deep', role: 'assistant', bubbles: deepDive })
    }
    if (depth === 'deep') {
      extraDeepDives.forEach((bubbles, index) => {
        next.push({ id: `extra-request-${index}`, role: 'user', text: 'Еще подробнее' })
        next.push({ id: `extra-${index}`, role: 'assistant', bubbles })
      })
    }
    return next
  }, [depth, extraDeepDives, intro, pendingDepth])

  useEffect(() => {
    return () => {
      if (followupTimerRef.current) clearTimeout(followupTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (depth !== 'deep') {
      setExtraDeepDives([])
      setExtraDeepDiveLoading(false)
    }
  }, [depth, intro])

  useEffect(() => {
    if (!pendingDepth) return
    if (depth === pendingDepth || depth === 'deep') {
      setPendingDepth(null)
    }
  }, [depth, pendingDepth])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    // Старт чтения сверху: при коротком инро не уводим прокрутку вниз.
    if (depth === 'quick' && !pendingDepth) {
      el.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    const anchorMessageId =
      extraDeepDives.length > 0 ? `extra-request-${extraDeepDives.length - 1}` : pendingDepth === 'deep' || depth === 'deep' ? 'deep-request' : 'details-request'
    const anchor = messageRefs.current[anchorMessageId]
    if (anchor) {
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
      const anchorTop = anchor.offsetTop + INTRO_CHAT_ANCHOR_OFFSET_PX
      el.scrollTo({ top: Math.min(maxTop, Math.max(0, anchorTop)), behavior: 'smooth' })
      return
    }
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
    el.scrollTo({ top: maxTop, behavior: 'smooth' })
  }, [depth, extraDeepDives.length, messages.length, pendingDepth])

  const queueFollowup = (targetDepth: Exclude<LessonIntroDepth, 'quick'>) => {
    if (pendingDepth) return
    setPendingDepth(targetDepth)
    if (followupTimerRef.current) clearTimeout(followupTimerRef.current)
    followupTimerRef.current = setTimeout(() => {
      followupTimerRef.current = null
      if (targetDepth === 'details') {
        onShowDetails()
        return
      }
      onShowDeepDive()
    }, INTRO_FOLLOWUP_DELAY_MS)
  }

  const handleDeepDiveClick = async () => {
    if (depth === 'deep') {
      if (extraDeepDiveLoading) return
      const nextIndex = extraDeepDives.length
      setExtraDeepDiveLoading(true)
      try {
        const response = await fetch('/api/lesson-intro-extra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            openAiChatPreset,
            audience,
            intro,
            iteration: nextIndex + 1,
            previousBlocks: extraDeepDives.flatMap((bubbles) => bubbles.map((bubble) => bubble.content)),
          }),
        })
        const data = (await response.json()) as { bubbles?: Bubble[] }
        if (response.ok && data.bubbles?.length) {
          setExtraDeepDives((items) => [...items, data.bubbles as Bubble[]])
          return
        }
      } catch {
        // Если генерация недоступна, всё равно даём следующий полезный блок из данных урока.
      } finally {
        setExtraDeepDiveLoading(false)
      }
      setExtraDeepDives((items) => [...items, buildExtraDeepDiveFallback(intro, nextIndex)])
      return
    }
    queueFollowup('deep')
  }

  const canShowDetails = depth === 'quick' && Boolean(intro.details) && !pendingDepth
  const canShowDeepDive = (depth === 'details' || depth === 'deep') && Boolean(intro.deepDive) && !pendingDepth

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
                {messages.map((message, index) => {
                  const previousRole = messages[index - 1]?.role as BubbleRole | undefined
                  const nextRole = messages[index + 1]?.role as BubbleRole | undefined
                  const position = getBubblePosition(previousRole, message.role, nextRole)

                  if (message.role === 'user') {
                    return (
                      <div
                        key={message.id}
                        ref={(node) => {
                          messageRefs.current[message.id] = node
                        }}
                      >
                        <ChatBubbleFrame
                          role="user"
                          position={position}
                          className="lesson-enter"
                          rowClassName="mb-2.5"
                        >
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                            {message.text}
                          </p>
                        </ChatBubbleFrame>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={message.id}
                      ref={(node) => {
                        messageRefs.current[message.id] = node
                      }}
                    >
                      <ChatBubbleFrame
                        role="assistant"
                        position={position}
                        className="lesson-enter"
                        rowClassName="mb-2.5"
                      >
                        <UnifiedLessonBubble bubbles={message.bubbles} animateSections />
                      </ChatBubbleFrame>
                    </div>
                  )
                })}
              </div>
            </div>

            <div
              className="shrink-0 border-t border-[var(--chat-shell-border)] bg-transparent px-2.5 pt-2.5 sm:px-3"
              style={{ paddingBottom: 'calc(var(--app-bottom-inset) + 0.625rem)' }}
            >
              <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-2">
                <div className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
                  <IntroChip variant="link" onClick={onBack}>
                    ← Назад
                  </IntroChip>
                  <IntroChip variant="tips" onClick={onShowExtras}>
                    Фишки
                  </IntroChip>
                  {canShowDetails && (
                    <IntroChip onClick={() => queueFollowup('details')}>
                      Подробнее
                    </IntroChip>
                  )}
                  {canShowDeepDive && (
                    <IntroChip variant="deep" onClick={handleDeepDiveClick} disabled={extraDeepDiveLoading}>
                      {extraDeepDiveLoading ? 'Создаю карточку...' : depth === 'deep' ? 'Сгенерировать ещё' : 'Еще подробнее'}
                    </IntroChip>
                  )}
                </div>
                <div className="flex w-full">
                  <IntroChip variant="primary" onClick={onStartLesson} disabled={loadingLesson}>
                    <span className="inline-grid justify-items-center whitespace-nowrap">
                      <span className="invisible col-start-1 row-start-1" aria-hidden>
                        Готовлю урок...
                      </span>
                      <span className="col-start-1 row-start-1">
                        {loadingLesson ? 'Готовлю урок...' : 'Начать урок'}
                      </span>
                    </span>
                  </IntroChip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
