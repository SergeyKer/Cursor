'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { useStaggeredSectionRevealMap, isStaggeredRevealComplete } from '@/hooks/useStaggeredSectionReveal'
import { ChatBubbleFrame, getBubblePosition, type BubbleRole } from '@/components/chat/ChatBubble'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import { resyncIosWebKitDialogComposerStackHeight } from '@/hooks/useDialogComposerStackHeight'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { isIosWebKitBrowser } from '@/lib/iosSafariViewport'
import {
  estimateIntroComposerMinHeight,
  LESSON_INTRO_SCROLL_CLASS,
} from '@/lib/lessonComposerLayout'
import { APP_BTN_PRIMARY_LESSON_START, BTN_INTERACTION_BASE } from '@/lib/homeCtaStyles'
import { LESSON_SCROLL_VIEWPORT_CLASS, scheduleScrollAfterLayout } from '@/lib/lessonFeedScroll'
import { LESSON_SECTION_REVEAL_INTERVAL_MS } from '@/lib/lessonRevealTiming'
import { getMenuTopicCopyByIntroTopic } from '@/lib/lessonCatalog'
import { buildLessonCoinIntroBubble, type LessonCoinIntroContext } from '@/lib/lessonCoinIntroCopy'
import { resolveLessonIntroPrimaryCtaLabel } from '@/lib/lessonIntroCtaCopy'
import { LESSON_VARIANT_PREPARE_LOADING_LABEL } from '@/lib/lessonVariantCtaCopy'
import type { AiProvider, Audience, OpenAiChatPreset } from '@/lib/types'
import type { Bubble, LessonIntro } from '@/types/lesson'

export type LessonIntroDepth = 'quick' | 'details' | 'deep'

type LessonIntroScreenProps = {
  intro: LessonIntro
  depth: LessonIntroDepth
  loadingLesson?: boolean
  /** Фоновая подмена варианта урока: кнопка показывает прогресс подготовки. */
  footerVariantRegenerating?: boolean
  provider: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience: Audience
  onShowDetails: () => void
  onShowDeepDive: () => void
  onStartLesson: () => void
  onShowExtras: () => void
  onBack: () => void
  lessonCoinIntroContext?: LessonCoinIntroContext | null
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
const MAIN_INTRO_BASE_SECTION_COUNT = 4
const FOLLOWUP_SECTION_COUNT = 3
const INTRO_CHAT_ANCHOR_OFFSET_PX = -4

function isStaggeredAssistantBlock(messageId: string): boolean {
  return (
    messageId === 'intro-main' ||
    messageId === 'details' ||
    messageId === 'deep' ||
    messageId.startsWith('extra-')
  )
}

function formatExtraDeepDiveError(raw?: string): string {
  const fallback = 'Не удалось сгенерировать блок. Проверьте провайдера в Настройках -> ИИ.'
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (!trimmed) return fallback

  if (
    trimmed.includes('unsupported_country_region_territory') ||
    trimmed.includes('Country, region, or territory not supported')
  ) {
    return 'Регион провайдера не поддерживается. Смените провайдера в Настройках -> ИИ.'
  }

  if (trimmed.includes('Missing OPENAI_API_KEY') || trimmed.includes('Missing OPENROUTER_API_KEY')) {
    return 'Не задан API-ключ провайдера. Проверьте .env и настройки ИИ.'
  }

  if (trimmed.includes('timed out')) {
    return 'Провайдер отвечает слишком долго. Попробуйте еще раз.'
  }

  return fallback
}

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

function buildMenuEntryBubble(intro: LessonIntro, audience: Audience): Bubble {
  const copy = getMenuTopicCopyByIntroTopic(intro.topic, audience, {
    long: intro.quick.takeaway,
  })
  const detailsLine = copy.short ? `• ${copy.short}: ${copy.long}` : `• ${copy.long}`
  return {
    type: 'info',
    content: `📘 ТЕМА УРОКА - ${copy.title}\n${detailsLine}`,
  }
}

function buildMainIntroBubbles(intro: LessonIntro, audience: Audience): Bubble[] {
  return [buildMenuEntryBubble(intro, audience), ...buildQuickBubbles(intro)]
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
      ? APP_BTN_PRIMARY_LESSON_START
      : variant === 'link'
        ? `${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-600 hover:from-white hover:to-sky-100 active:brightness-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60`
        : variant === 'tips'
          ? `${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-100 px-2.5 py-2 text-center text-[13px] font-semibold text-amber-800 hover:from-amber-100 hover:to-yellow-200 active:brightness-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60`
          : variant === 'deep'
            ? `${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-violet-200 bg-gradient-to-r from-violet-100 to-indigo-100 px-2.5 py-2 text-center text-[13px] font-semibold text-violet-800 hover:from-violet-200 hover:to-indigo-200 active:brightness-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60`
          : `${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-sky-200 bg-gradient-to-r from-cyan-50 to-blue-100 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-700 hover:from-cyan-100 hover:to-blue-200 active:brightness-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60`

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
  footerVariantRegenerating = false,
  provider,
  openAiChatPreset,
  audience,
  onShowDetails,
  onShowDeepDive,
  onStartLesson,
  onShowExtras,
  onBack,
  lessonCoinIntroContext = null,
}: LessonIntroScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const composerStackRef = useRef<HTMLDivElement>(null)
  const followupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isIosWebKitClient = useMemo(
    () => typeof navigator !== 'undefined' && isIosWebKitBrowser(navigator.userAgent),
    []
  )
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [pendingDepth, setPendingDepth] = useState<Exclude<LessonIntroDepth, 'quick'> | null>(null)
  const [extraDeepDives, setExtraDeepDives] = useState<Bubble[][]>([])
  const [extraDeepDiveLoading, setExtraDeepDiveLoading] = useState(false)
  const [extraDeepDiveError, setExtraDeepDiveError] = useState<string | null>(null)
  const introPrimaryCtaLabel = resolveLessonIntroPrimaryCtaLabel({
    loadingLesson,
    footerVariantRegenerating,
  })

  const mainIntroBubbles = useMemo(
    () => buildMainIntroBubbles(intro, audience),
    [audience, intro]
  )
  const coinIntroBubble = useMemo(
    () =>
      lessonCoinIntroContext ? buildLessonCoinIntroBubble(lessonCoinIntroContext) : null,
    [lessonCoinIntroContext]
  )
  const staggeredRevealTargets = useMemo(() => {
    const targets = [{ id: 'intro-main', sectionCount: MAIN_INTRO_BASE_SECTION_COUNT }]
    if (depth === 'details' || depth === 'deep') {
      targets.push({ id: 'details', sectionCount: FOLLOWUP_SECTION_COUNT })
    }
    if (depth === 'deep') {
      targets.push({ id: 'deep', sectionCount: FOLLOWUP_SECTION_COUNT })
      for (let index = 0; index < extraDeepDives.length; index += 1) {
        targets.push({ id: `extra-${index}`, sectionCount: FOLLOWUP_SECTION_COUNT })
      }
    }
    return targets
  }, [depth, extraDeepDives.length])

  const visibleSectionCounts = useStaggeredSectionRevealMap(
    staggeredRevealTargets,
    intro.topic,
    LESSON_SECTION_REVEAL_INTERVAL_MS
  )
  const isIntroRevealComplete = isStaggeredRevealComplete(visibleSectionCounts, staggeredRevealTargets)
  const isIntroPrimaryCtaDisabled =
    loadingLesson || footerVariantRegenerating || !isIntroRevealComplete

  const messages = useMemo<IntroChatMessage[]>(() => {
    const next: IntroChatMessage[] = []
    next.push({
      id: 'intro-main',
      role: 'assistant',
      bubbles: mainIntroBubbles,
    })
    if (coinIntroBubble) {
      next.push({
        id: 'intro-coin',
        role: 'assistant',
        bubbles: [coinIntroBubble],
      })
    }
    const details = buildDetailsBubbles(intro)
    const shouldShowDetailsRequest = pendingDepth === 'details' || pendingDepth === 'deep' || depth === 'details' || depth === 'deep'
    const shouldShowDetailsAnswer = depth === 'details' || depth === 'deep'
    if (details && shouldShowDetailsRequest) {
      next.push({ id: 'details-request', role: 'user', text: 'Почему так...' })
    }
    if (details && shouldShowDetailsAnswer) {
      next.push({ id: 'details', role: 'assistant', bubbles: details })
    }
    const deepDive = buildDeepDiveBubbles(intro)
    const shouldShowDeepRequest = pendingDepth === 'deep' || depth === 'deep'
    if (deepDive && shouldShowDeepRequest) {
      next.push({ id: 'deep-request', role: 'user', text: 'Частые ошибки...' })
    }
    if (depth === 'deep' && deepDive) {
      next.push({ id: 'deep', role: 'assistant', bubbles: deepDive })
    }
    if (depth === 'deep') {
      extraDeepDives.forEach((bubbles, index) => {
        next.push({ id: `extra-request-${index}`, role: 'user', text: 'Частые ошибки...' })
        next.push({ id: `extra-${index}`, role: 'assistant', bubbles })
      })
    }
    return next
  }, [audience, coinIntroBubble, depth, extraDeepDives, intro, mainIntroBubbles, pendingDepth])

  useEffect(() => {
    return () => {
      if (followupTimerRef.current) clearTimeout(followupTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (depth !== 'deep') {
      setExtraDeepDives([])
      setExtraDeepDiveLoading(false)
      setExtraDeepDiveError(null)
    }
  }, [depth, intro])

  useEffect(() => {
    if (!pendingDepth) return
    if (depth === pendingDepth || depth === 'deep') {
      setPendingDepth(null)
    }
  }, [depth, pendingDepth])

  useLayoutEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    return scheduleScrollAfterLayout(() => {
      // Старт чтения сверху: при коротком инро не уводим прокрутку вниз.
      if (depth === 'quick' && !pendingDepth) {
        el.scrollTo({ top: 0, behavior: 'auto' })
        return
      }
      const anchorMessageId =
        extraDeepDives.length > 0
          ? `extra-request-${extraDeepDives.length - 1}`
          : pendingDepth === 'deep' || depth === 'deep'
            ? 'deep-request'
            : 'details-request'
      const anchor = messageRefs.current[anchorMessageId]
      if (anchor) {
        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
        const anchorTop = anchor.offsetTop + INTRO_CHAT_ANCHOR_OFFSET_PX
        el.scrollTo({ top: Math.min(maxTop, Math.max(0, anchorTop)), behavior: 'smooth' })
        return
      }
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
      el.scrollTo({ top: maxTop, behavior: 'smooth' })
    })
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
      setExtraDeepDiveError(null)
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
        const data = (await response.json()) as { bubbles?: Bubble[]; error?: string }
        if (response.ok && data.bubbles?.length) {
          setExtraDeepDives((items) => [...items, data.bubbles as Bubble[]])
          return
        }
        setExtraDeepDiveError(formatExtraDeepDiveError(data.error))
        return
      } catch {
        // При сетевом сбое даём локальный блок, чтобы пользователь не застрял.
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
  const introComposerMinHeight = useMemo(() => {
    if (!isIosWebKitClient) return undefined
    return estimateIntroComposerMinHeight({
      hasSecondaryChips: true,
      hasErrorBanner: Boolean(extraDeepDiveError),
    })
  }, [extraDeepDiveError, isIosWebKitClient])

  useLayoutEffect(() => {
    if (!isIosWebKitClient) return
    return resyncIosWebKitDialogComposerStackHeight(composerStackRef.current)
  }, [
    canShowDeepDive,
    canShowDetails,
    depth,
    extraDeepDiveError,
    isIosWebKitClient,
    loadingLesson,
  ])

  return (
    <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div
            className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
            style={{ boxShadow: 'var(--chat-shell-shadow)' }}
          >
            <DialogGlassScrollHost>
              <div
                ref={scrollContainerRef}
                className={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3`}
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

                  const isStaggered = isStaggeredAssistantBlock(message.id)

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
                        className={isStaggered ? '' : 'lesson-enter'}
                        rowClassName="mb-2.5"
                      >
                        <UnifiedLessonBubble
                          bubbles={message.bubbles}
                          animateSections
                          layout="detached"
                          visibleSectionCount={
                            isStaggered ? (visibleSectionCounts[message.id] ?? 0) : undefined
                          }
                        />
                      </ChatBubbleFrame>
                    </div>
                  )
                  })}
                </div>
              </div>
            </DialogGlassScrollHost>

            <DialogComposerStack
              ref={composerStackRef}
              className={CHAT_COMPOSER_STACK_TOP_CLASS}
              style={{
                paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
                ...(introComposerMinHeight != null ? { minHeight: introComposerMinHeight } : {}),
              }}
              contentMaxWidthClass="max-w-[22rem]"
            >
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
                  <IntroChip variant="link" onClick={onBack}>
                    ← Назад
                  </IntroChip>
                  <IntroChip variant="tips" onClick={onShowExtras}>
                    Фишки
                  </IntroChip>
                  {canShowDetails && (
                    <IntroChip onClick={() => queueFollowup('details')}>
                      Почему так...
                    </IntroChip>
                  )}
                  {canShowDeepDive && (
                    <IntroChip variant="deep" onClick={handleDeepDiveClick} disabled={extraDeepDiveLoading}>
                      {extraDeepDiveLoading ? 'Создаю карточку...' : depth === 'deep' ? 'Сгенерировать ещё' : 'Частые ошибки...'}
                    </IntroChip>
                  )}
                </div>
                {extraDeepDiveError && (
                  <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--status-warning-text)]">
                    {extraDeepDiveError}
                  </p>
                )}
                <div className="flex w-full">
                  <IntroChip
                    variant="primary"
                    onClick={onStartLesson}
                    disabled={isIntroPrimaryCtaDisabled}
                  >
                    <span className="inline-grid justify-items-center whitespace-nowrap">
                      <span className="invisible col-start-1 row-start-1" aria-hidden>
                        {LESSON_VARIANT_PREPARE_LOADING_LABEL}
                      </span>
                      <span className="col-start-1 row-start-1">{introPrimaryCtaLabel}</span>
                    </span>
                  </IntroChip>
                </div>
              </div>
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
