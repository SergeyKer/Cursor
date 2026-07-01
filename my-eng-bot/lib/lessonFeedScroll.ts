import { PUZZLE_BOTTOM_STACK_FALLBACK } from '@/lib/puzzlePanelLayout'

export const LESSON_INPUT_GAP_PX = 10
/** Отступ последнего пузыря от верха scroll-viewport при доскролле под клавиатуру. */
export const LESSON_FEED_KEYBOARD_SCROLL_GAP_PX = 8
export const LESSON_SCROLL_GAP_REM = 0.625
/** Симметричный padding scroll-контейнера (tailwind p-2.5). */
export const LESSON_SCROLL_CONTAINER_PADDING_REM = LESSON_SCROLL_GAP_REM
/** Fallback из globals.css - высота input на шагах 1–4. */
export const CHAT_INPUT_HEIGHT_REM = 5.5

export type LessonScrollLayoutInput = {
  hasCurrentStep: boolean
  hasPostLessonOptions: boolean
  isSentencePuzzle: boolean
  bottomStackHeightPx: number
  /** Нижняя панель - sibling вне scroll (LessonStepRenderer). */
  composerOutsideScroll?: boolean
}

export type LessonScrollBehaviorReason =
  | 'initial'
  | 'step_change'
  | 'overflow_follow'
  | 'reveal'
  | 'new_message'
  | 'feedback'

export function resolveLessonScrollBehavior(input: {
  prefersReducedMotion: boolean
  reason: LessonScrollBehaviorReason
}): ScrollBehavior {
  if (input.prefersReducedMotion) return 'auto'
  if (input.reason === 'initial') {
    return 'auto'
  }
  return 'smooth'
}

/** Плавный scroll только при reveal новой карточки шага; первый шаг - без сдвига. */
export function resolveLessonShellScrollBehavior(input: {
  prefersReducedMotion: boolean
  isFirstLessonStep: boolean
  /** Intro-полоска / отложенные choice-чипы меняют высоту ленты во время enter - smooth lerp дёргает. */
  deferLayoutSettling?: boolean
}): ScrollBehavior {
  if (input.prefersReducedMotion || input.isFirstLessonStep || input.deferLayoutSettling) {
    return 'auto'
  }
  return 'smooth'
}

/** ResizeObserver overflow_follow: не догонять ленту, пока reveal или choice-чипы ещё не показаны. */
export function shouldSkipLessonFeedOverflowFollow(input: {
  isRevealInProgress: boolean
  deferChoiceChipsUntilCardReveal: boolean
  isChoiceChipsVisible: boolean
  revealEndedAtMs: number | null
  nowMs?: number
}): boolean {
  if (input.isRevealInProgress) return true
  if (input.deferChoiceChipsUntilCardReveal && !input.isChoiceChipsVisible) return true
  if (
    input.deferChoiceChipsUntilCardReveal &&
    isWithinRevealEndOverflowSettleWindow(input.revealEndedAtMs, input.nowMs)
  ) {
    return true
  }
  return false
}

/** После reveal choice-шага лента уже следовала за карточкой; лишний overflow_follow дёргает пузырь. */
export function shouldSkipRevealEndOverflowScroll(input: {
  deferChoiceChipsUntilCardReveal: boolean
  shouldRenderChoiceChips: boolean
  wasRevealInProgress: boolean
  isRevealInProgress: boolean
}): boolean {
  return (
    input.deferChoiceChipsUntilCardReveal &&
    input.shouldRenderChoiceChips &&
    input.wasRevealInProgress &&
    !input.isRevealInProgress
  )
}

export const LESSON_REVEAL_END_OVERFLOW_SETTLE_MS = 300

/** Короткое окно после конца reveal - не догонять ленту из ResizeObserver messagesStack. */
export function isWithinRevealEndOverflowSettleWindow(
  revealEndedAtMs: number | null,
  nowMs: number = Date.now()
): boolean {
  if (revealEndedAtMs == null) return false
  return nowMs - revealEndedAtMs < LESSON_REVEAL_END_OVERFLOW_SETTLE_MS
}

/** id хвоста ленты: ответ пользователя. */
export function isLessonFeedAnswerTailMessageId(tailMessageId?: string): boolean {
  return tailMessageId?.startsWith('answer-step-') ?? false
}

/** id хвоста: «Engvo проверяет…». */
export function isLessonFeedCheckingTailMessageId(tailMessageId?: string): boolean {
  return tailMessageId?.startsWith('checking-') ?? false
}

/** id хвоста практики: «Engvo проверяет…». */
export function isPracticeFeedCheckingTailMessageId(tailMessageId?: string): boolean {
  return tailMessageId?.startsWith('practice-checking-') ?? false
}

/** id хвоста: «Верно» / «Неверно». */
export function isLessonFeedFeedbackTailMessageId(tailMessageId?: string): boolean {
  return tailMessageId?.startsWith('feedback-') ?? false
}

/** id хвоста: пустая current-оболочка шага (intro-чипы после success). */
export function isLessonFeedCurrentLessonTailMessageId(tailMessageId?: string): boolean {
  return /^lesson-\d+-\d+-current$/.test(tailMessageId ?? '')
}

/** Практика: та же политика smooth, что и в уроке. */
export function resolvePracticeFeedScrollRequest(input: {
  prefersReducedMotion: boolean
  reason: LessonScrollBehaviorReason
  state:
    | 'submitting'
    | 'checking'
    | 'feedback'
    | 'correction'
    | 'active'
    | 'briefing'
    | 'completed'
    | 'error'
    | 'generating_next'
    | 'idle'
}): ScrollBehavior {
  return resolveLessonScrollBehavior({
    prefersReducedMotion: input.prefersReducedMotion,
    reason: input.reason,
  })
}

/** Fallback, если scrollend не сработал (уже у дна ленты или старый браузер). */
export const LESSON_FEED_SCROLL_COMPLETE_FALLBACK_MS = 650

/** Lerp-шаг follow-tail scroll в уроках (не замедление - стабильный догон хвоста). */
export const LESSON_FEED_SCROLL_LERP = 0.2
export const LESSON_FEED_SCROLL_STABLE_FRAMES = 2
export const LESSON_FEED_SCROLL_MAX_MS = 650
export const LESSON_FEED_SCROLL_SNAP_PX = 1

const activeFollowByContainer = new WeakMap<HTMLElement, () => void>()

export function resolveFollowTailTargetTop(
  scrollContainer: HTMLElement,
  mode: LessonFeedScrollMode
): number {
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  if (mode === 'scroll_to_max') return maxTop
  if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) return 0
  return maxTop
}

export function stepFollowTailScrollTop(params: {
  currentScrollTop: number
  targetScrollTop: number
  lerp?: number
}): number {
  const lerp = params.lerp ?? LESSON_FEED_SCROLL_LERP
  const delta = params.targetScrollTop - params.currentScrollTop
  if (Math.abs(delta) < LESSON_FEED_SCROLL_SNAP_PX) {
    return params.targetScrollTop
  }
  return params.currentScrollTop + delta * lerp
}

export function isFollowTailScrollSettled(params: {
  currentScrollTop: number
  targetScrollTop: number
  stableFrames: number
  requiredStableFrames?: number
}): boolean {
  const requiredStableFrames = params.requiredStableFrames ?? LESSON_FEED_SCROLL_STABLE_FRAMES
  return (
    Math.abs(params.targetScrollTop - params.currentScrollTop) < LESSON_FEED_SCROLL_SNAP_PX &&
    params.stableFrames >= requiredStableFrames
  )
}

export type FollowLessonFeedTailOptions = {
  mode: LessonFeedScrollMode
  behavior: ScrollBehavior
  onComplete?: () => void
}

export function followLessonFeedTail(
  scrollContainer: HTMLElement | null,
  options: FollowLessonFeedTailOptions
): () => void {
  if (!scrollContainer) {
    options.onComplete?.()
    return () => {}
  }

  activeFollowByContainer.get(scrollContainer)?.()

  const { mode, behavior, onComplete } = options

  if (behavior === 'auto') {
    const targetTop = resolveFollowTailTargetTop(scrollContainer, mode)
    if (Math.abs(scrollContainer.scrollTop - targetTop) < LESSON_FEED_SCROLL_SNAP_PX) {
      onComplete?.()
      return () => {}
    }
    scrollContainer.scrollTop = targetTop
    onComplete?.()
    return () => {}
  }

  let rafId = 0
  let cancelled = false
  let stableFrames = 0
  let lastTargetTop = -1
  let completeCalled = false
  const startedAt = performance.now()

  const complete = () => {
    if (completeCalled || cancelled) return
    completeCalled = true
    activeFollowByContainer.delete(scrollContainer)
    onComplete?.()
  }

  const cancel = () => {
    if (cancelled) return
    cancelled = true
    if (rafId) cancelAnimationFrame(rafId)
    activeFollowByContainer.delete(scrollContainer)
  }

  const tick = () => {
    if (cancelled) return

    const targetTop = resolveFollowTailTargetTop(scrollContainer, mode)
    let currentTop = scrollContainer.scrollTop

    if (currentTop > targetTop + LESSON_FEED_SCROLL_SNAP_PX) {
      scrollContainer.scrollTop = targetTop
      currentTop = targetTop
      stableFrames = 0
      lastTargetTop = targetTop
    }

    if (Math.abs(targetTop - lastTargetTop) < LESSON_FEED_SCROLL_SNAP_PX) {
      stableFrames += 1
    } else {
      stableFrames = 0
      lastTargetTop = targetTop
    }

    if (
      isFollowTailScrollSettled({
        currentScrollTop: currentTop,
        targetScrollTop: targetTop,
        stableFrames,
      })
    ) {
      scrollContainer.scrollTop = targetTop
      complete()
      return
    }

    if (performance.now() - startedAt >= LESSON_FEED_SCROLL_MAX_MS) {
      scrollContainer.scrollTop = targetTop
      complete()
      return
    }

    scrollContainer.scrollTop = stepFollowTailScrollTop({
      currentScrollTop: currentTop,
      targetScrollTop: targetTop,
    })
    rafId = requestAnimationFrame(tick)
  }

  activeFollowByContainer.set(scrollContainer, cancel)
  rafId = requestAnimationFrame(tick)
  return cancel
}

export function followLessonFeedTailWithComplete(
  scrollContainer: HTMLElement | null,
  options: FollowLessonFeedTailOptions
): () => void {
  return followLessonFeedTail(scrollContainer, options)
}

function invokeAfterScrollComplete(
  scrollContainer: HTMLElement,
  behavior: ScrollBehavior,
  onComplete: () => void
): () => void {
  if (behavior === 'auto') {
    onComplete()
    return () => {}
  }

  let done = false
  const complete = () => {
    if (done) return
    done = true
    onComplete()
  }

  const onScrollEnd = () => complete()
  scrollContainer.addEventListener('scrollend', onScrollEnd, { once: true })
  const fallback = window.setTimeout(complete, LESSON_FEED_SCROLL_COMPLETE_FALLBACK_MS)

  return () => {
    scrollContainer.removeEventListener('scrollend', onScrollEnd)
    window.clearTimeout(fallback)
  }
}

export function scrollLessonFeedTailIfNeededWithComplete(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
  onComplete?: () => void
): () => void {
  if (!scrollContainer) return () => {}
  scrollLessonFeedTailIfNeeded(scrollContainer, behavior)
  if (!onComplete) return () => {}
  return invokeAfterScrollComplete(scrollContainer, behavior, onComplete)
}

export function scrollLessonFeedToMaxWithComplete(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
  onComplete?: () => void
): () => void {
  if (!scrollContainer) return () => {}
  scrollLessonFeedToMax(scrollContainer, behavior)
  if (!onComplete) return () => {}
  return invokeAfterScrollComplete(scrollContainer, behavior, onComplete)
}

export function resolveBottomStackHeightCss(input: {
  bottomStackHeightPx: number
  hasPostLessonOptions: boolean
  isSentencePuzzle: boolean
  postLessonFallbackRem?: number
}): string {
  if (input.bottomStackHeightPx > 0) {
    return `${input.bottomStackHeightPx}px`
  }
  if (input.hasPostLessonOptions) {
    return `${input.postLessonFallbackRem ?? 12}rem`
  }
  if (input.isSentencePuzzle) {
    return PUZZLE_BOTTOM_STACK_FALLBACK
  }
  return `${CHAT_INPUT_HEIGHT_REM}rem`
}

/** Scroll-padding ленты при композере-соседе (Android / desktop); на iOS dialog сбрасывается CSS. */
export function resolveDialogFeedScrollPadding(gapPx = LESSON_INPUT_GAP_PX): string {
  return `calc(${LESSON_SCROLL_GAP_REM}rem + var(--chat-composer-stack-height, ${CHAT_INPUT_HEIGHT_REM}rem) + ${gapPx}px)`
}

export function resolveDialogFeedScrollPaddingStyle(gapPx = LESSON_INPUT_GAP_PX): {
  paddingBottom: string
  scrollPaddingBottom: string
} {
  const padding = resolveDialogFeedScrollPadding(gapPx)
  return { paddingBottom: padding, scrollPaddingBottom: padding }
}

export function resolveScrollBottomPadding(input: LessonScrollLayoutInput): string | undefined {
  if (!input.hasCurrentStep) return undefined

  if (input.composerOutsideScroll) {
    return undefined
  }

  const bottomStackHeightCss = resolveBottomStackHeightCss({
    bottomStackHeightPx: input.bottomStackHeightPx,
    hasPostLessonOptions: input.hasPostLessonOptions,
    isSentencePuzzle: input.isSentencePuzzle,
  })

  return `calc(${LESSON_SCROLL_GAP_REM}rem + ${bottomStackHeightCss} + ${LESSON_INPUT_GAP_PX}px)`
}

export function resolveShowFeedEndAnchor(input: {
  hasPostLessonOptions: boolean
  isSentencePuzzle: boolean
  includePuzzleAnchor?: boolean
}): boolean {
  return input.hasPostLessonOptions || (input.includePuzzleAnchor === true && input.isSentencePuzzle)
}

export type LessonFeedScrollMode = 'scroll_to_max' | 'tail_if_needed'

/** Отключить pin/scrollToMax: checking (не на пазле) и advancing. */
export function resolveRelaxFeedTailPin(input: {
  status: 'idle' | 'checking' | 'feedback' | 'completed'
  showAdvancingStatusLine: boolean
  isAdvancingToNextStep: boolean
  isAdvancingToNextVariant: boolean
  /** На sentence_puzzle pin и scroll_to_max держим и во время checking - отступ «Engvo проверяет…» как на 1/3. */
  isSentencePuzzle?: boolean
}): boolean {
  if (input.isSentencePuzzle && input.status === 'checking') {
    return false
  }
  return (
    input.status === 'checking' ||
    (input.showAdvancingStatusLine &&
      (input.isAdvancingToNextStep || input.isAdvancingToNextVariant))
  )
}

export function shouldPinLessonFeedTailNearComposer(input: {
  useFeedScrollToMax: boolean
  relaxFeedTailPin: boolean
}): boolean {
  return input.useFeedScrollToMax && !input.relaxFeedTailPin
}

const PUZZLE_FEED_PINNED_STACK_CLASS = 'flex min-h-full flex-col justify-end'
const PUZZLE_FEED_OVERFLOW_STACK_CLASS = 'flex min-h-full flex-col'

/**
 * justify-end работает только пока лента короче viewport.
 * При переполнении (2+ попытка пазла) - mt-auto на checking + scroll_to_max.
 */
export function resolvePuzzleFeedMessagesStackClass(input: {
  pinFeedTailNearComposer: boolean
  isFeedOverflowing: boolean
}): string | undefined {
  if (!input.pinFeedTailNearComposer) return undefined
  return input.isFeedOverflowing
    ? PUZZLE_FEED_OVERFLOW_STACK_CLASS
    : PUZZLE_FEED_PINNED_STACK_CLASS
}

export function shouldMtAutoPinPuzzleCheckingRow(input: {
  isSentencePuzzle: boolean
  status: 'idle' | 'checking' | 'feedback' | 'completed'
  isFeedOverflowing: boolean
  isCheckingMessage: boolean
  isLastInFeed: boolean
}): boolean {
  return (
    input.isSentencePuzzle &&
    input.status === 'checking' &&
    input.isFeedOverflowing &&
    input.isLastInFeed &&
    input.isCheckingMessage
  )
}

export function resolveLessonFeedScrollMode(input: {
  useFeedScrollToMax: boolean
  relaxFeedTailPin: boolean
}): LessonFeedScrollMode {
  if (!input.useFeedScrollToMax) return 'tail_if_needed'
  if (input.relaxFeedTailPin) return 'tail_if_needed'
  return 'scroll_to_max'
}

/** rem → px при типичном 16px root (для расчётов в тестах). */
export function remToPx(rem: number, rootPx = 16): number {
  return rem * rootPx
}

export function resolveLessonScrollContainerPaddingPx(rootPx = 16): number {
  return remToPx(LESSON_SCROLL_CONTAINER_PADDING_REM, rootPx)
}

export function parseLessonScrollPaddingPx(
  padding: string | undefined,
  rootPx = 16
): number {
  if (!padding) {
    return resolveLessonScrollContainerPaddingPx(rootPx)
  }
  const gapPx = remToPx(LESSON_SCROLL_GAP_REM, rootPx) + LESSON_INPUT_GAP_PX
  if (padding.includes(PUZZLE_BOTTOM_STACK_FALLBACK)) {
    return gapPx + remToPx(18, rootPx)
  }
  if (padding.includes(`${CHAT_INPUT_HEIGHT_REM}rem`)) {
    return gapPx + remToPx(CHAT_INPUT_HEIGHT_REM, rootPx)
  }
  if (padding === `calc(${LESSON_SCROLL_GAP_REM}rem + ${LESSON_INPUT_GAP_PX}px)`) {
    return gapPx
  }
  throw new Error(`Unsupported padding in test: ${padding}`)
}

export function computeMaxScrollTop(scrollHeight: number, clientHeight: number): number {
  return Math.max(0, scrollHeight - clientHeight)
}

/** Хвост ленты уже у целевой позиции - не скроллить (без тика вверх). */
export function isLessonFeedScrolledToTail(
  scrollContainer: HTMLElement | null,
  mode: LessonFeedScrollMode = 'tail_if_needed'
): boolean {
  if (!scrollContainer) return true
  const targetTop = resolveFollowTailTargetTop(scrollContainer, mode)
  return Math.abs(scrollContainer.scrollTop - targetTop) < LESSON_FEED_SCROLL_SNAP_PX
}

export function scrollLessonFeedToModeIfNeeded(
  scrollContainer: HTMLElement | null,
  mode: LessonFeedScrollMode,
  behavior: ScrollBehavior = 'auto'
): boolean {
  if (!scrollContainer || isLessonFeedScrolledToTail(scrollContainer, mode)) {
    return false
  }
  if (mode === 'scroll_to_max') {
    scrollLessonFeedToMax(scrollContainer, behavior)
  } else {
    scrollLessonFeedTailIfNeeded(scrollContainer, behavior)
  }
  return true
}

export function scrollLessonFeedToModeWithCompleteIfNeeded(
  scrollContainer: HTMLElement | null,
  mode: LessonFeedScrollMode,
  behavior: ScrollBehavior = 'auto',
  onComplete?: () => void
): () => void {
  if (!scrollContainer) {
    onComplete?.()
    return () => {}
  }
  if (isLessonFeedScrolledToTail(scrollContainer, mode)) {
    onComplete?.()
    return () => {}
  }
  if (mode === 'scroll_to_max') {
    return scrollLessonFeedToMaxWithComplete(scrollContainer, behavior, onComplete)
  }
  return scrollLessonFeedTailIfNeededWithComplete(scrollContainer, behavior, onComplete)
}

/** Двойной rAF: дождаться layout перед scrollTo (нужно на iOS Safari). */
export function scheduleScrollAfterLayout(run: () => void): () => void {
  let innerRaf = 0
  const outerRaf = requestAnimationFrame(() => {
    innerRaf = requestAnimationFrame(run)
  })
  return () => {
    cancelAnimationFrame(outerRaf)
    if (innerRaf) cancelAnimationFrame(innerRaf)
  }
}

/** Класс scroll-контейнера ленты урока/чата: touch-скролл на iOS Safari. */
export const LESSON_SCROLL_VIEWPORT_CLASS =
  'lesson-scroll-viewport min-h-0 flex-1 overflow-y-auto overflow-x-hidden'

/** scrollTo(max) - для puzzle / post-lesson. */
export function scrollLessonFeedToMax(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto'
): void {
  if (!scrollContainer) return
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  scrollContainer.scrollTo({ top: maxTop, behavior })
}

/**
 * Скролл к хвосту ленты - как в Chat.tsx: scrollTo(scrollHeight, behavior).
 * При короткой ленте браузер остаётся на scrollTop = 0.
 */
export function scrollLessonFeedTailIfNeeded(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto'
): void {
  if (!scrollContainer) return
  scrollLessonFeedToMax(scrollContainer, behavior)
}

export function getOffsetTopWithinAncestor(ancestor: HTMLElement, element: HTMLElement): number {
  const ancestorRect = ancestor.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  return elementRect.top - ancestorRect.top + ancestor.scrollTop
}

/** Минимальные поля сообщения для snapshot-скролла чата (без translation-метаданных). */
export type ChatFeedScrollMessage = {
  role: string
  content: string
  translation?: string
  translationError?: string
}

export type ChatFeedScrollSnapshot = {
  messageCount: number
  tailKey: string
}

export function buildChatFeedScrollSnapshot(
  messages: readonly ChatFeedScrollMessage[]
): ChatFeedScrollSnapshot {
  const last = messages[messages.length - 1]
  const tailKey = last ? `${last.role}:${last.content}` : ''
  return { messageCount: messages.length, tailKey }
}

/** Скролл к хвосту только при новой реплике или смене текста последнего сообщения. */
export function shouldScrollChatFeed(
  prev: ChatFeedScrollSnapshot,
  next: ChatFeedScrollSnapshot
): boolean {
  return next.messageCount > prev.messageCount || next.tailKey !== prev.tailKey
}

/** Изменились только поля перевода (prefetch / загрузка по кнопке). */
export function chatFeedTranslationFieldsChanged(
  prevMessages: readonly ChatFeedScrollMessage[],
  nextMessages: readonly ChatFeedScrollMessage[]
): boolean {
  if (prevMessages.length !== nextMessages.length) return false
  for (let i = 0; i < prevMessages.length; i++) {
    const prev = prevMessages[i]
    const next = nextMessages[i]
    if (
      prev?.translation !== next?.translation ||
      prev?.translationError !== next?.translationError
    ) {
      return true
    }
  }
  return false
}

/** Последний пузырь user/assistant в ленте (для доскролла при клавиатуре). */
export function findLessonFeedLastMessageRow(scrollContainer: HTMLElement): HTMLElement | null {
  const rows = scrollContainer.querySelectorAll<HTMLElement>(
    '[data-role="assistant"], [data-role="user"]'
  )
  if (rows.length > 0) return rows[rows.length - 1] ?? null

  const stack = scrollContainer.firstElementChild
  if (stack?.lastElementChild instanceof HTMLElement) return stack.lastElementChild
  return null
}

export function computeLessonFeedScrollTopForTailMessage(
  scrollContainer: HTMLElement,
  target: HTMLElement,
  gapPx = LESSON_FEED_KEYBOARD_SCROLL_GAP_PX
): number {
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  const targetTop = getOffsetTopWithinAncestor(scrollContainer, target)
  const targetBottom = targetTop + target.offsetHeight
  const minScrollTop = targetBottom - scrollContainer.clientHeight + gapPx
  return Math.min(maxTop, Math.max(0, minScrollTop))
}

/** Как Chat learning flow: верх нового assistant-пузыря у верха viewport. */
export function computeLessonFeedScrollTopForBubbleTopAlign(
  scrollContainer: HTMLElement,
  target: HTMLElement,
  insetPx = 8
): number {
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  const targetTop = getOffsetTopWithinAncestor(scrollContainer, target)
  return Math.min(maxTop, Math.max(0, targetTop - insetPx))
}

export function scrollLessonFeedToAlignLastAssistantBubbleTop(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
  insetPx = 8
): boolean {
  if (!scrollContainer) return false
  const target = findLessonFeedLastMessageRow(scrollContainer)
  if (!target) return false
  const top = computeLessonFeedScrollTopForBubbleTopAlign(scrollContainer, target, insetPx)
  if (Math.abs(scrollContainer.scrollTop - top) < LESSON_FEED_SCROLL_SNAP_PX) return false
  scrollContainer.scrollTo({ top, behavior })
  return true
}

/**
 * Минимальный доскролл: низ пузыря виден в viewport (только вниз, без отката вверх).
 */
export function scrollLessonFeedMessageRowIntoViewIfNeeded(
  scrollContainer: HTMLElement | null,
  target: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
  gapPx = LESSON_FEED_KEYBOARD_SCROLL_GAP_PX
): boolean {
  if (!scrollContainer || !target) return false

  const targetTop = getOffsetTopWithinAncestor(scrollContainer, target)
  const targetBottom = targetTop + target.offsetHeight
  const visibleBottom = scrollContainer.scrollTop + scrollContainer.clientHeight
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  if (targetBottom + gapPx <= visibleBottom + LESSON_FEED_SCROLL_SNAP_PX) return false

  const top = computeLessonFeedScrollTopForTailMessage(scrollContainer, target, gapPx)
  const nextTop = Math.max(scrollContainer.scrollTop, top)
  if (Math.abs(scrollContainer.scrollTop - nextTop) < LESSON_FEED_SCROLL_SNAP_PX) return false
  scrollContainer.scrollTo({ top: nextTop, behavior })
  return true
}

/**
 * Минимальный доскролл: последний пузырь виден над композером (не scrollToMax в padding).
 * Только вниз - не откатываем scrollTop, если хвост уже виден (фокус без клавиатуры).
 */
export function scrollLessonFeedTailMessageIntoView(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
  gapPx = LESSON_FEED_KEYBOARD_SCROLL_GAP_PX
): boolean {
  if (!scrollContainer) return false
  const target = findLessonFeedLastMessageRow(scrollContainer)
  return scrollLessonFeedMessageRowIntoViewIfNeeded(scrollContainer, target, behavior, gapPx)
}

export function wasLessonFeedNearTail(
  scrollContainer: HTMLElement | null,
  thresholdPx = 48
): boolean {
  if (!scrollContainer) return false
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  return scrollContainer.scrollTop >= maxTop - thresholdPx
}

/** iOS Safari dialog: повторный доскролл после смены padding под fixed-композер. */
export function resyncLessonFeedScrollNearTail(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto'
): () => void {
  if (!scrollContainer) return () => {}
  return scheduleScrollAfterLayout(() => {
    if (!wasLessonFeedNearTail(scrollContainer)) return
    followLessonFeedTail(scrollContainer, { mode: 'scroll_to_max', behavior })
  })
}

export function findLessonFeedScrollViewportFromComposerStack(
  composerStack: HTMLElement
): HTMLElement | null {
  const host =
    composerStack.closest('.dialog-glass-scroll-host') ?? composerStack.closest('.glass-surface')
  return host?.querySelector<HTMLElement>('.lesson-scroll-viewport') ?? null
}

export function isLessonFeedOverflowing(scrollContainer: HTMLElement | null): boolean {
  if (!scrollContainer) return false
  return scrollContainer.scrollHeight > scrollContainer.clientHeight
}

/**
 * Модель scrollIntoView({ block: 'end' }) для нулевого якоря в конце контента.
 * Если идеальный scrollTop < 0 - браузер остаётся на 0 (контент «липнет» к верху).
 */
export function simulateScrollTopAfterIntoViewEnd(params: {
  contentHeightPx: number
  clientHeightPx: number
  scrollPaddingBottomPx: number
}): number {
  const { contentHeightPx, clientHeightPx, scrollPaddingBottomPx } = params
  const scrollHeight = contentHeightPx + scrollPaddingBottomPx
  const maxScrollTop = computeMaxScrollTop(scrollHeight, clientHeightPx)
  const idealScrollTop = contentHeightPx - (clientHeightPx - scrollPaddingBottomPx)
  if (idealScrollTop < 0) return 0
  return Math.min(idealScrollTop, maxScrollTop)
}

/** Видимый зазор между низом последнего сообщения и низом scroll-viewport при scrollTop. */
export function computeVisibleGapAboveScrollBottom(params: {
  contentHeightPx: number
  scrollPaddingBottomPx: number
  clientHeightPx: number
  scrollTop: number
}): number {
  const { contentHeightPx, clientHeightPx, scrollTop } = params
  const contentBottomInViewport = contentHeightPx - scrollTop
  return Math.max(0, clientHeightPx - contentBottomInViewport)
}

/** scrollTo({ top: scrollHeight }) в браузере даёт scrollTop = maxScrollTop. */
export function simulateScrollTopAfterScrollToMax(params: {
  contentHeightPx: number
  scrollPaddingBottomPx: number
  clientHeightPx: number
}): number {
  const scrollHeight = params.contentHeightPx + params.scrollPaddingBottomPx
  return computeMaxScrollTop(scrollHeight, params.clientHeightPx)
}

/** Модель scrollLessonFeedTailIfNeeded при заданных размерах. */
export function simulateScrollTopAfterTailIfNeeded(params: {
  contentHeightPx: number
  scrollPaddingBottomPx: number
  clientHeightPx: number
}): number {
  const scrollHeight = params.contentHeightPx + params.scrollPaddingBottomPx
  if (scrollHeight <= params.clientHeightPx) return 0
  return computeMaxScrollTop(scrollHeight, params.clientHeightPx)
}
