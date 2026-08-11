'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
} from 'react'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import EngvoFeedServiceTypingText from '@/components/engvo/EngvoFeedServiceTypingText'
import {
  ChatBubbleFrame,
  getBubblePosition,
  CHAT_FEED_SERVICE_STATUS_ROW_CLASS,
} from '@/components/chat/ChatBubble'
import TutorComposer from '@/components/tutor/TutorComposer'
import TutorIdleMenu from '@/components/tutor/TutorIdleMenu'
import { useTutorSessionOptional } from '@/components/tutor/TutorSessionProvider'
import {
  CHAT_COMPOSER_STACK_TOP_CLASS,
  DIALOG_COMPOSER_PADDING_BOTTOM,
  getChatComposerStackLayout,
} from '@/lib/chatComposerMetrics'
import { recordTutorMicroWrongSignal } from '@/lib/learningMemory/record'
import {
  findLessonFeedLastMessageRow,
  isLessonFeedOverflowing,
  LESSON_SCROLL_VIEWPORT_CLASS,
  resolveLessonScrollBehavior,
  scheduleScrollAfterLayout,
  scrollLessonFeedToAlignLastAssistantBubbleTop,
  scrollLessonFeedToMax,
} from '@/lib/lessonFeedScroll'
import { LESSON_BUBBLE_ENTER_MS } from '@/lib/lessonRevealTiming'
import { useLessonFeedTailEnter } from '@/hooks/useLessonFeedTailEnter'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { alignExplainTopicToFaq } from '@/lib/tutor/alignExplainTopicToFaq'
import { buildTutorTopicContext } from '@/lib/tutor/buildTopicContext'
import {
  buildTutorFollowUpChip,
} from '@/lib/tutor/buildFollowUpPlaceholder'
import {
  followUpLegacyFlags,
  initialFollowUpHopState,
  nextFollowUpHopState,
  resolveFollowUpHopFromSnapshot,
  visibleFollowUpHop,
  type FollowUpHopState,
} from '@/lib/tutor/followUpHop'
import { canOfferTutorMicro } from '@/lib/tutor/microEligible'
import { peekTutorCheatsheetAvailable } from '@/lib/tutor/peekTutorCheatsheetAvailable'
import { shouldRetainLastExplainOnDeepen } from '@/lib/tutor/resolveContinueLastExplain'
import { bandFromMicroScore } from '@/lib/tutor/microScore'
import { resolveTutorMicroPack } from '@/lib/tutor/resolveMicroPack'
import { chipsFromLabels } from '@/lib/tutor/normalizeTriage'
import { recordTutorCuriosity } from '@/lib/tutor/curiosityStore'
import { featureFlags } from '@/lib/featureFlags'
import {
  buildIdleFaqFilters,
  clearHalfOldestShown,
  idleFaqSeed,
  matchLocalFaq,
  pickIdleFaq,
  recordShownFaqIds,
} from '@/lib/tutor/localFaq'
import { lookupLocalExplainPack } from '@/lib/tutor/localExplain/lookup'
import { localTutorTriage, resolvePendingTriageFollowUp } from '@/lib/tutor/localTriage'
import type { TutorSchoolPhotoResult } from '@/lib/tutor/normalizeSchoolPhoto'
import { matchTutorGate } from '@/lib/tutor/tutorGate'
import { routeTutorTurn } from '@/lib/tutor/tutorTurnRouter'
import type {
  TutorComposerChip,
  TutorExplainAnswer,
  TutorMicroItem,
  TutorMicroPack,
  TutorTopicContext,
  TutorTriageResult,
} from '@/lib/tutor/types'
import {
  clearTutorReturnContext,
  consumeTutorReturnContext,
  stashTutorReturnContext,
  type TutorReturnContextSnapshot,
} from '@/lib/tutor/tutorReturnContext'
import {
  FOLLOW_UP_CHIP_BANK,
  TUTOR_CHAT_COPY,
  buildMicroStrongFinaleText,
  pickTutorIdleBullets,
  pickTutorIdleExamples,
  tutorComposerPlaceholder,
} from '@/lib/uiCopy/tutorChat'
import type { TutorIdleExampleItem } from '@/components/tutor/TutorIdleMenu'
import { isAndroidMobileUserAgent } from '@/lib/mobileViewport'
import {
  isIosChromeBrowser,
  isIosLikeDevice,
  needsVoiceComposerWebMetrics,
} from '@/lib/sttClient'
import { useLessonVoiceInput } from '@/lib/voice/useLessonVoiceInput'
import { useDialogFeedKeyboardScroll } from '@/hooks/useDialogFeedKeyboardScroll'
import {
  isTutorMicroRevealAborted,
  TUTOR_MICRO_BUBBLE_HOLD_MS,
  TUTOR_MICRO_TYPING_HOLD_MS,
  waitTutorMicroReveal,
} from '@/lib/tutor/microRevealTiming'
import { shouldPinTutorFeedToTop } from '@/lib/tutor/shouldPinTutorFeedToTop'
import { needsTutorMicroSessionExitGuard } from '@/lib/tutor/needsTutorMicroSessionExitGuard'
import {
  buildTutorFooterView,
  resolveTutorFooterMoment,
  type TutorFooterView,
} from '@/lib/tutor/tutorFooter'
import {
  isTutorMicroChoiceFrozen,
  resolveTutorMicroChipsResetKey,
  shouldShowTutorMicroOptions,
} from '@/lib/tutor/tutorMicroChoicePanel'

const TUTOR_FEED_ENTER_FALLBACK_MS = LESSON_BUBBLE_ENTER_MS + 50

type ThreadRole = 'user' | 'assistant'

type ThreadMessage = {
  id: string
  role: ThreadRole
  text: string
  explain?: TutorExplainAnswer
}

type MicroPhase = 'idle' | 'revealing' | 'active' | 'finale'

function isTutorMicroLocked(phase: MicroPhase): boolean {
  return phase === 'revealing' || phase === 'active'
}

export type TutorChatPanelProps = {
  initialPrefill?: string
  /** Готово → меню Репетитор idle (space); embedded menu may pass summary. */
  onDone?: () => void
  /** Idle lives in slide-out menu; first question promotes to dialog-space. */
  embeddedInMenu?: boolean
  /** Called after stash when leaving menu idle for space. */
  onPromoteToSpace?: () => void
  /** MyPlan: submit initialPrefill once on mount (space only). */
  autoSubmitInitial?: boolean
  /** Mid-cycle «Закрепить 2 мин» — SessionExit confirm in AppShell. */
  onSessionExitGuardChange?: (locked: boolean) => void
  /** Live footer chrome (compact / micro sessionMeter). */
  onFooterViewChange?: (view: TutorFooterView | null) => void
  /** Visit session XP for micro meter LEFT. */
  sessionXp?: number
  /** Successful in_scope Explain (canonicalKey). */
  onExplainSuccess?: (canonicalKey: string) => void
  /** Micro finale completed for topic. */
  onMicroFinale?: (canonicalKey: string) => void
  /** Miss→tutor: show «К справочнику» after explain (not during micro). */
  showReferenceReturnChip?: boolean
  /** Miss→tutor: chip / optional parallel to onDone for reference restore. */
  onReturnToReference?: () => void
}

const LESSON_HIDDEN_VOICE_STATUS_MESSAGES = new Set([
  'Голосовой ввод...',
  'Распознаю речь...',
  '[Распознавание затянулось. Скажите короче или введите текст с клавиатуры (включая цифры и знаки).]',
])

const HIDDEN_VOICE_STATUS_MARKERS = [
  'не удалось распознать речь',
  'речь не распознана',
  'ошибка распознавания речи',
]

const HARD_VOICE_ERROR_MARKERS = [
  'микрофон',
  'не поддерживается',
  'защищённом контексте',
  'защищенном контексте',
  'https',
]

function isHardVoiceErrorMessage(message: string | null): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return HARD_VOICE_ERROR_MARKERS.some((marker) => normalized.includes(marker))
}

function shouldHideVoiceStatusMessage(message: string | null): boolean {
  if (!message) return true
  if (LESSON_HIDDEN_VOICE_STATUS_MESSAGES.has(message)) return true
  const normalized = message.toLowerCase()
  return HIDDEN_VOICE_STATUS_MARKERS.some((marker) => normalized.includes(marker))
}

function formatExplainBubble(answer: TutorExplainAnswer): string {
  const parts = [...answer.paragraphs]
  if (answer.examplesEn.length > 0) {
    parts.push(answer.examplesEn.map((ex) => `• ${ex}`).join('\n'))
  }
  if (answer.rememberRu) parts.push(answer.rememberRu)
  return parts.join('\n\n')
}

function resolveTutorInviteKey(thread: ThreadMessage[]): string {
  if (thread.length === 0) return 'tutor:empty'
  for (let i = thread.length - 1; i >= 0; i -= 1) {
    const msg = thread[i]!
    if (msg.role === 'assistant') {
      return `${msg.id}:${msg.text.slice(0, 80)}`
    }
  }
  return 'tutor:empty'
}

export default function TutorChatPanel({
  initialPrefill = '',
  onDone,
  embeddedInMenu = false,
  onPromoteToSpace,
  autoSubmitInitial = false,
  onSessionExitGuardChange,
  onFooterViewChange,
  sessionXp = 0,
  onExplainSuccess,
  onMicroFinale,
  showReferenceReturnChip = false,
  onReturnToReference,
}: TutorChatPanelProps) {
  const session = useTutorSessionOptional()
  const [draft, setDraft] = useState(() =>
    autoSubmitInitial && initialPrefill.trim() ? '' : initialPrefill
  )
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [triageChips, setTriageChips] = useState<TutorComposerChip[]>([])
  const [anchorQuery, setAnchorQuery] = useState<string | null>(null)
  const [postExplainChips, setPostExplainChips] = useState(false)
  const [followUpHopState, setFollowUpHopState] = useState<FollowUpHopState>(initialFollowUpHopState)
  const [lastExplain, setLastExplain] = useState<TutorExplainAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadingMicro, setLoadingMicro] = useState(false)
  /** After «Закрепить 2 мин»: exit pin-top immediately (survives loadingMicro→revealing gap). */
  const [microTailMode, setMicroTailMode] = useState(false)
  const [microPhase, setMicroPhase] = useState<MicroPhase>('idle')
  const [microTypingVisible, setMicroTypingVisible] = useState(false)
  const answeringMicroRef = useRef(false)
  const microRevealAbortRef = useRef<AbortController | null>(null)
  const [microPack, setMicroPack] = useState<TutorMicroPack | null>(null)
  const [microIndex, setMicroIndex] = useState(0)
  const [microCorrectCount, setMicroCorrectCount] = useState(0)
  /** Answer snapshot for freeze/highlight; null during opening reveal. */
  const [microReveal, setMicroReveal] = useState<{
    chosenText: string
    correct: boolean
  } | null>(null)
  const [pendingTriageQuery, setPendingTriageQuery] = useState<string | null>(null)
  const [isIosDeviceClient, setIsIosDeviceClient] = useState(false)
  const [isIosChromeClient, setIsIosChromeClient] = useState(false)
  const [voiceWebMetricsClient, setVoiceWebMetricsClient] = useState(false)
  const [isMobileAttach, setIsMobileAttach] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [feedEnterReady, setFeedEnterReady] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const idBase = useId()
  const seqRef = useRef(0)
  const restoredRef = useRef(false)
  const pendingTriageDoneRef = useRef(false)
  const autoSubmitDoneRef = useRef(false)
  const cheatsheetInflightRef = useRef(false)
  const cheatsheetChooseRef = useRef<import('@/lib/reference/resolveReferenceOpen').ReferenceCandidate[]>([])

  const prefersReducedMotion = usePrefersReducedMotion()
  const feedMessageIds = useMemo(() => thread.map((message) => message.id), [thread])
  const feedTailEnter = useLessonFeedTailEnter({
    scrollContainerRef: scrollRef,
    messageIds: feedMessageIds,
    prefersReducedMotion,
    enabled: feedEnterReady,
    scrollOnNewMessage: false,
  })

  const inviteKey = useMemo(() => resolveTutorInviteKey(thread), [thread])
  const voice = useLessonVoiceInput({ inviteKey, speechMode: 'mix' })
  const sessionLevel = session?.settings.level ?? 'a2'
  const idleExamples = useMemo((): TutorIdleExampleItem[] => {
    if (featureFlags.tutorFaqPoolV1) {
      const seed = idleFaqSeed(sessionLevel)
      const filters = buildIdleFaqFilters()
      let picked = pickIdleFaq(sessionLevel, 3, seed, filters)
      // Half-reset only helps shown-exhaustion, not ban-starvation.
      if (picked.length < 3 && filters.shownIds.length > 0) {
        clearHalfOldestShown()
        picked = pickIdleFaq(sessionLevel, 3, seed, {
          ...filters,
          shownIds: buildIdleFaqFilters().shownIds,
        })
      }
      if (picked.length > 0) {
        return picked.map((e) => ({ id: e.id, questionRu: e.questionRu }))
      }
    }
    return pickTutorIdleExamples(3, idleFaqSeed(sessionLevel)).map((questionRu, index) => ({
      id: `bank_${index}_${questionRu.slice(0, 24)}`,
      questionRu,
    }))
  }, [sessionLevel])

  const composerPlaceholder = useMemo(() => {
    const audience = session?.settings.audience === 'child' ? 'child' : 'adult'
    return tutorComposerPlaceholder(audience)
  }, [session?.settings.audience])

  const followUpChip = useMemo((): TutorComposerChip | null => {
    const hop = visibleFollowUpHop(followUpHopState)
    if (hop === 0 || !postExplainChips || !lastExplain) {
      return null
    }
    if (triageChips.length > 0) return null
    if (microPhase !== 'idle' && microPhase !== 'finale') return null
    if (hop === 2) {
      const text = FOLLOW_UP_CHIP_BANK.exit
      return { id: 'follow_up', labelRu: text, submitText: text }
    }
    const audience = session?.settings.audience === 'child' ? 'child' : 'adult'
    const submitText = buildTutorFollowUpChip({
      answer: lastExplain,
      level: session?.settings.level ?? 'a2',
      audience,
      excludeQuestionRu: anchorQuery,
    })
    if (!submitText?.trim()) return null
    const text = submitText.trim()
    return {
      id: 'follow_up',
      labelRu: text,
      submitText: text,
    }
  }, [
    anchorQuery,
    followUpHopState,
    lastExplain,
    microPhase,
    postExplainChips,
    session?.settings.audience,
    session?.settings.level,
    triageChips.length,
  ])
  const isIdle = thread.length === 0 && !busy
  const idleBullets = useMemo(
    () => (isIdle ? pickTutorIdleBullets(3) : []),
    [isIdle]
  )

  useEffect(() => {
    if (!featureFlags.tutorFaqPoolV1 || !isIdle) return
    const ids = idleExamples.filter((e) => !e.id.startsWith('bank_')).map((e) => e.id)
    if (ids.length === 0) return
    recordShownFaqIds(ids)
  }, [idleExamples, isIdle])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ua = window.navigator.userAgent
    setIsIosDeviceClient(isIosLikeDevice(ua))
    setIsIosChromeClient(isIosChromeBrowser(ua))
    setVoiceWebMetricsClient(needsVoiceComposerWebMetrics(ua))
    setIsMobileAttach(isIosLikeDevice(ua) || isAndroidMobileUserAgent(ua))
  }, [])

  useEffect(() => {
    // autoSubmit: prefill is submit payload only — never leave it in the composer.
    if (autoSubmitInitial) return
    if (initialPrefill.trim()) {
      setDraft(initialPrefill)
      voice.setDraftText(initialPrefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on prefill change
  }, [autoSubmitInitial, initialPrefill])

  useEffect(() => {
    if (voice.isVoiceActive || voice.listening) {
      setDraft(voice.displayText)
      return
    }
    if (voice.draftText !== draft) {
      setDraft(voice.draftText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from voice machine
  }, [voice.displayText, voice.draftText, voice.isVoiceActive, voice.listening])

  const setDraftSynced = useCallback(
    (value: string) => {
      setDraft(value)
      voice.setDraftText(value)
    },
    [voice]
  )

  useLayoutEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const snap = consumeTutorReturnContext()
    if (!snap) return
    setDraft(snap.draft)
    voice.setDraftText(snap.draft)
    setAnchorQuery(snap.anchorQuery)
    setPostExplainChips(snap.postExplainChips)
    setFollowUpHopState(
      resolveFollowUpHopFromSnapshot({
        followUpHop: snap.followUpHop,
        followUpNudgeConsumed: snap.followUpNudgeConsumed,
        followUpNudgeArmed: snap.followUpNudgeArmed,
      })
    )
    setThread(snap.thread.map((m) => ({ id: m.id, role: m.role, text: m.text })))
    if (snap.lastExplain) {
      setLastExplain(snap.lastExplain)
    }
    if (snap.pendingTriageQuery?.trim()) {
      setPendingTriageQuery(snap.pendingTriageQuery.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, [])

  // Intervening commit: hook syncs prevMessageCount while enabled=false, then enable enter.
  useEffect(() => {
    setFeedEnterReady(true)
  }, [])

  const pinFeedToTop =
    shouldPinTutorFeedToTop(thread, lastExplain) && !microTailMode

  const pinTutorFeedViewport = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    if (pinFeedToTop) {
      container.scrollTop = 0
      return
    }

    const behavior = resolveLessonScrollBehavior({
      prefersReducedMotion,
      reason: 'new_message',
    })

    // Learning Chat branching: service/typing → toMax; last assistant → align top; else toMax.
    const serviceRow = container.querySelector<HTMLElement>('[data-feed-service-status]')
    if (serviceRow) {
      if (isLessonFeedOverflowing(container)) {
        scrollLessonFeedToMax(container, behavior)
      }
      return
    }

    const last = findLessonFeedLastMessageRow(container)
    if (last?.getAttribute('data-role') === 'assistant') {
      scrollLessonFeedToAlignLastAssistantBubbleTop(container, behavior)
      return
    }

    if (isLessonFeedOverflowing(container)) {
      scrollLessonFeedToMax(container, behavior)
    }
  }, [pinFeedToTop, prefersReducedMotion])

  const finishTutorFeedEnter = useCallback(
    (messageId: string) => {
      feedTailEnter.markEnterFinished(messageId)
      scheduleScrollAfterLayout(pinTutorFeedViewport)
    },
    [feedTailEnter, pinTutorFeedViewport]
  )

  const handleTutorFeedAnimationEnd = useCallback(
    (messageId: string, event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName !== 'lessonSlideIn') return
      if (event.target !== event.currentTarget) return
      finishTutorFeedEnter(messageId)
    },
    [finishTutorFeedEnter]
  )

  useEffect(() => {
    if (!feedEnterReady || prefersReducedMotion) return
    const entering = thread.find((msg) => {
      const enterClass =
        msg.role === 'user'
          ? feedTailEnter.getUserEnterClass(msg.id)
          : feedTailEnter.getAssistantEnterClass(msg.id)
      return enterClass !== ''
    })
    if (!entering) return
    const timer = window.setTimeout(() => {
      finishTutorFeedEnter(entering.id)
    }, TUTOR_FEED_ENTER_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [feedEnterReady, feedTailEnter, finishTutorFeedEnter, prefersReducedMotion, thread])

  useLayoutEffect(() => {
    if (!feedEnterReady) return
    return scheduleScrollAfterLayout(pinTutorFeedViewport)
  }, [feedEnterReady, loadingMicro, microPhase, microTailMode, pinTutorFeedViewport, thread.length])

  useEffect(() => {
    const locked = needsTutorMicroSessionExitGuard({ loadingMicro, microPhase })
    onSessionExitGuardChange?.(locked)
    return () => {
      onSessionExitGuardChange?.(false)
    }
  }, [loadingMicro, microPhase, onSessionExitGuardChange])

  useEffect(() => {
    if (!onFooterViewChange) return
    const audience = session?.settings.audience === 'child' ? 'child' : 'adult'
    const canOfferMicro = Boolean(
      lastExplain &&
        canOfferTutorMicro(lastExplain, {
          llmEnabled: featureFlags.tutorMicroLlmV1,
        })
    )
    const moment = resolveTutorFooterMoment({
      busy,
      loadingMicro,
      microPhase,
      hasMicroPack: Boolean(microPack),
      hasLastExplain: Boolean(lastExplain),
      hasTriageChips: triageChips.length > 0,
      canOfferMicro,
    })
    onFooterViewChange(
      buildTutorFooterView({
        moment,
        audience,
        microIndex,
        microTotal: microPack?.items.length ?? 0,
        sessionXp,
      })
    )
    return () => {
      onFooterViewChange(null)
    }
  }, [
    busy,
    lastExplain,
    loadingMicro,
    microIndex,
    microPack,
    microPhase,
    onFooterViewChange,
    session?.settings.audience,
    sessionXp,
    triageChips.length,
  ])

  useEffect(() => {
    if (!busy && !microTypingVisible) return
    return scheduleScrollAfterLayout(() => {
      const el = scrollRef.current
      if (!el) return
      if (pinFeedToTop) {
        el.scrollTop = 0
        return
      }
      if (!isLessonFeedOverflowing(el)) return
      const behavior = resolveLessonScrollBehavior({
        prefersReducedMotion,
        reason: 'new_message',
      })
      scrollLessonFeedToMax(el, behavior)
    })
  }, [busy, microTypingVisible, pinFeedToTop, prefersReducedMotion])

  useDialogFeedKeyboardScroll(scrollRef, true)

  const nextId = useCallback(() => {
    seqRef.current += 1
    return `${idBase}-${seqRef.current}`
  }, [idBase])

  const append = useCallback(
    (role: ThreadRole, text: string, explain?: TutorExplainAnswer) => {
      setThread((prev) => [...prev, { id: nextId(), role, text, ...(explain ? { explain } : {}) }])
    },
    [nextId]
  )

  const buildSnapshot = useCallback((): Omit<TutorReturnContextSnapshot, 'savedAt'> => {
    const legacy = followUpLegacyFlags(followUpHopState)
    const hop = visibleFollowUpHop(followUpHopState)
    return {
      draft,
      anchorQuery,
      postExplainChips,
      followUpNudgeConsumed: legacy.followUpNudgeConsumed,
      followUpNudgeArmed: legacy.followUpNudgeArmed,
      followUpHop: hop,
      thread: thread.map(({ id, role, text }) => ({ id, role, text })),
      ...(lastExplain ? { lastExplain } : {}),
    }
  }, [anchorQuery, draft, followUpHopState, lastExplain, postExplainChips, thread])

  const promoteWithUserQuery = useCallback(
    (text: string, baseThread?: ThreadMessage[]) => {
      const trimmed = text.trim()
      if (!trimmed || !onPromoteToSpace) return false
      const prior = baseThread ?? thread
      const userMsg = { id: nextId(), role: 'user' as const, text: trimmed }
      stashTutorReturnContext({
        draft: '',
        anchorQuery: null,
        postExplainChips: false,
        followUpNudgeConsumed: false,
        followUpNudgeArmed: false,
        followUpHop: 0,
        thread: [...prior.map(({ id, role, text: t }) => ({ id, role, text: t })), userMsg],
        pendingTriageQuery: trimmed,
        ...(lastExplain ? { lastExplain } : {}),
      })
      onPromoteToSpace()
      return true
    },
    [lastExplain, nextId, onPromoteToSpace, thread]
  )

  const beginMicroReveal = useCallback((): AbortSignal => {
    microRevealAbortRef.current?.abort()
    const controller = new AbortController()
    microRevealAbortRef.current = controller
    return controller.signal
  }, [])

  const abortMicro = useCallback(() => {
    microRevealAbortRef.current?.abort()
    microRevealAbortRef.current = null
    setMicroTypingVisible(false)
    setMicroPhase('idle')
    setMicroPack(null)
    setMicroIndex(0)
    setMicroCorrectCount(0)
    setMicroReveal(null)
    setLoadingMicro(false)
    setMicroTailMode(false)
    answeringMicroRef.current = false
  }, [])

  useEffect(() => {
    return () => {
      microRevealAbortRef.current?.abort()
      microRevealAbortRef.current = null
    }
  }, [])

  const runExplain = useCallback(
    async (query: string, topicContext?: TutorTopicContext | null) => {
      abortMicro()
      setBusy(true)
      const hadLastExplain = lastExplain != null
      const prevCanonicalKey = lastExplain?.topicAnchor.canonicalKey
      const audience = session?.settings.audience ?? 'adult'
      const level = session?.settings.level ?? 'a2'
      const isDeepen = Boolean(topicContext)
      const failDeepenHop = () => {
        if (!isDeepen) return
        setFollowUpHopState((s) => nextFollowUpHopState(s, { type: 'continueExplainFail' }))
      }
      try {
        // Wave0 GP: local pack before network (skip on follow-up topicContext).
        if (!topicContext) {
          const localAnswer = lookupLocalExplainPack(query, audience)
          if (localAnswer) {
            const aligned = alignExplainTopicToFaq({
              answer: localAnswer,
              query,
              level,
            })
            setLastExplain(aligned)
            setAnchorQuery(aligned.topicAnchor.title || query)
            setPostExplainChips(true)
            setFollowUpHopState((s) => nextFollowUpHopState(s, { type: 'newExplain' }))
            setTriageChips([])
            append('assistant', formatExplainBubble(aligned), aligned)
            const newKey = aligned.topicAnchor.canonicalKey
            onExplainSuccess?.(newKey)
            if (!prevCanonicalKey || prevCanonicalKey !== newKey) {
              recordTutorCuriosity({
                topicTitle: aligned.topicAnchor.title || aligned.title,
                questionRu: query,
                canonicalKey: newKey,
              })
            }
            return
          }
        }
        const response = await fetch('/api/tutor-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            ...(topicContext ? { topicContext } : {}),
            audience,
            level,
            provider: session?.settings.provider ?? 'openai',
            openAiChatPreset: session?.settings.openAiChatPreset,
          }),
        })
        const data = (await response.json()) as {
          scope?: 'in_scope' | 'out_of_scope'
          answer?: TutorExplainAnswer
          messageRu?: string
          userMessage?: string
          error?: string
        }
        if (!response.ok) {
          append('assistant', data.userMessage || TUTOR_CHAT_COPY.explainFailed)
          setPostExplainChips(hadLastExplain)
          failDeepenHop()
          return
        }
        if (data.scope === 'out_of_scope') {
          append('assistant', data.messageRu || TUTOR_CHAT_COPY.outOfScopeFallback)
          setPostExplainChips(hadLastExplain)
          failDeepenHop()
          return
        }
        if (!data.answer) {
          append('assistant', data.userMessage || TUTOR_CHAT_COPY.explainFailed)
          setPostExplainChips(hadLastExplain)
          failDeepenHop()
          return
        }
        const rawAnswer = data.answer
        const answer = isDeepen
          ? rawAnswer
          : alignExplainTopicToFaq({ answer: rawAnswer, query, level })
        // CONTINUE deepen: keep strong lastExplain when model returns weak satellite
        // (e.g. «Напиши ещё примеры» → how_to_say) so micro/cheatsheet chips stay.
        const retain =
          isDeepen &&
          lastExplain != null &&
          shouldRetainLastExplainOnDeepen(lastExplain, answer)
        if (!retain) {
          setLastExplain(answer)
          setAnchorQuery(answer.topicAnchor.title || query)
        }
        setPostExplainChips(true)
        setFollowUpHopState((s) =>
          nextFollowUpHopState(s, {
            type: isDeepen ? 'continueExplainOk' : 'newExplain',
          })
        )
        setTriageChips([])
        append('assistant', formatExplainBubble(answer), answer)
        if (!retain) {
          const newKey = answer.topicAnchor.canonicalKey
          onExplainSuccess?.(newKey)
          if (!prevCanonicalKey || prevCanonicalKey !== newKey) {
            recordTutorCuriosity({
              topicTitle: answer.topicAnchor.title || answer.title,
              questionRu: query,
              canonicalKey: newKey,
            })
          }
        }
      } catch {
        append('assistant', TUTOR_CHAT_COPY.explainFailed)
        setPostExplainChips(hadLastExplain)
        failDeepenHop()
      } finally {
        setBusy(false)
      }
    },
    [abortMicro, append, lastExplain, onExplainSuccess, session]
  )

  const analyzeSchoolPhoto = useCallback(
    async (imageDataUrl: string) => {
      if (busy || isTutorMicroLocked(microPhase)) return
      setBusy(true)
      const photoUserId = nextId()
      const photoUserMsg: ThreadMessage = {
        id: photoUserId,
        role: 'user',
        text: TUTOR_CHAT_COPY.photoUserLabel,
      }
      setThread((prev) => [...prev, photoUserMsg])
      let pendingExplain: string | null = null
      let multiAssistantText: string | null = null
      try {
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'tutorSchoolPhoto',
            imageDataUrl,
            audience: session?.settings.audience ?? 'adult',
            level: session?.settings.level ?? 'a2',
            provider: session?.settings.provider ?? 'openai',
            openAiChatPreset: session?.settings.openAiChatPreset,
          }),
        })
        const data = (await response.json()) as {
          schoolPhoto?: TutorSchoolPhotoResult
          userMessage?: string
          error?: string
        }
        if (!response.ok || !data.schoolPhoto) {
          const errText = data.userMessage || data.error || TUTOR_CHAT_COPY.photoReject
          if (embeddedInMenu && onPromoteToSpace) {
            const errMsg = { id: nextId(), role: 'assistant' as const, text: errText }
            stashTutorReturnContext({
              draft: '',
              anchorQuery: null,
              postExplainChips: false,
              thread: [
                ...thread.map(({ id, role, text }) => ({ id, role, text })),
                { id: photoUserId, role: 'user', text: TUTOR_CHAT_COPY.photoUserLabel },
                errMsg,
              ],
              ...(lastExplain ? { lastExplain } : {}),
            })
            onPromoteToSpace()
            return
          }
          append('assistant', errText)
          return
        }
        const result = data.schoolPhoto
        if (result.kind === 'rejected') {
          if (embeddedInMenu && onPromoteToSpace) {
            const errMsg = { id: nextId(), role: 'assistant' as const, text: result.messageRu }
            stashTutorReturnContext({
              draft: '',
              anchorQuery: null,
              postExplainChips: false,
              thread: [
                ...thread.map(({ id, role, text }) => ({ id, role, text })),
                { id: photoUserId, role: 'user', text: TUTOR_CHAT_COPY.photoUserLabel },
                errMsg,
              ],
              ...(lastExplain ? { lastExplain } : {}),
            })
            onPromoteToSpace()
            return
          }
          append('assistant', result.messageRu)
          return
        }
        if (result.topics.length === 1) {
          pendingExplain = result.topics[0]!
          if (embeddedInMenu && onPromoteToSpace) {
            stashTutorReturnContext({
              draft: '',
              anchorQuery: null,
              postExplainChips: false,
              thread: [
                ...thread.map(({ id, role, text }) => ({ id, role, text })),
                { id: photoUserId, role: 'user', text: TUTOR_CHAT_COPY.photoUserLabel },
              ],
              pendingTriageQuery: pendingExplain,
              ...(lastExplain ? { lastExplain } : {}),
            })
            onPromoteToSpace()
            return
          }
          setAnchorQuery(pendingExplain)
          return
        }
        multiAssistantText = TUTOR_CHAT_COPY.photoMultiPick
        if (embeddedInMenu && onPromoteToSpace) {
          const assistMsg = { id: nextId(), role: 'assistant' as const, text: multiAssistantText }
          stashTutorReturnContext({
            draft: '',
            anchorQuery: null,
            postExplainChips: false,
            thread: [
              ...thread.map(({ id, role, text }) => ({ id, role, text })),
              { id: photoUserId, role: 'user', text: TUTOR_CHAT_COPY.photoUserLabel },
              assistMsg,
            ],
            ...(lastExplain ? { lastExplain } : {}),
          })
          onPromoteToSpace()
          return
        }
        setAnchorQuery(null)
        setPostExplainChips(false)
        setTriageChips(chipsFromLabels(result.topics))
        append('assistant', multiAssistantText)
      } catch {
        const errText = TUTOR_CHAT_COPY.photoReject
        if (embeddedInMenu && onPromoteToSpace) {
          const errMsg = { id: nextId(), role: 'assistant' as const, text: errText }
          stashTutorReturnContext({
            draft: '',
            anchorQuery: null,
            postExplainChips: false,
            thread: [
              ...thread.map(({ id, role, text }) => ({ id, role, text })),
              { id: photoUserId, role: 'user', text: TUTOR_CHAT_COPY.photoUserLabel },
              errMsg,
            ],
            ...(lastExplain ? { lastExplain } : {}),
          })
          onPromoteToSpace()
          return
        }
        append('assistant', errText)
      } finally {
        setBusy(false)
      }
      if (pendingExplain) void runExplain(pendingExplain)
    },
    [
      append,
      busy,
      embeddedInMenu,
      lastExplain,
      microPhase,
      nextId,
      onPromoteToSpace,
      runExplain,
      session,
      thread,
    ]
  )

  const handlePaperclipClick = useCallback(() => {
    if (busy || isTutorMicroLocked(microPhase) || voice.isVoiceActive) return
    setAttachMenuOpen((open) => !open)
  }, [busy, microPhase, voice.isVoiceActive])

  const handlePhotoFile = useCallback(
    (file: File | null) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        append('assistant', TUTOR_CHAT_COPY.photoReject)
        return
      }
      if (file.size > 6 * 1024 * 1024) {
        append('assistant', TUTOR_CHAT_COPY.photoTooLarge)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : null
        if (!result || !result.startsWith('data:image/')) {
          append('assistant', TUTOR_CHAT_COPY.photoReject)
          return
        }
        void analyzeSchoolPhoto(result)
      }
      reader.onerror = () => append('assistant', TUTOR_CHAT_COPY.photoReject)
      reader.readAsDataURL(file)
    },
    [analyzeSchoolPhoto, append]
  )

  const openCameraInput = useCallback(() => {
    cameraInputRef.current?.click()
    setAttachMenuOpen(false)
  }, [])

  const openGalleryInput = useCallback(() => {
    galleryInputRef.current?.click()
    setAttachMenuOpen(false)
  }, [])

  const closeAttachMenu = useCallback(() => {
    setAttachMenuOpen(false)
  }, [])

  useEffect(() => {
    if (busy || isTutorMicroLocked(microPhase) || voice.isVoiceActive) {
      setAttachMenuOpen(false)
    }
  }, [busy, microPhase, voice.isVoiceActive])

  useEffect(() => {
    if (!attachMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAttachMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [attachMenuOpen])

  const handleMicClick = useCallback(() => {
    if (busy || isTutorMicroLocked(microPhase)) return
    voice.resetMicAnimation()
    if (voice.listening) {
      voice.stopListening()
      return
    }
    if (voice.micActionActive || voice.voicePhase === 'finalizing') return
    voice.startListening()
  }, [busy, microPhase, voice])

  const applyTriage = useCallback(
    (result: TutorTriageResult) => {
      if (result.kind === 'A') {
        setAnchorQuery(result.query)
        setTriageChips([])
        void runExplain(result.query)
        return
      }
      if (result.kind === 'B') {
        setAnchorQuery(result.topicHint)
        setTriageChips(result.chips)
        setPostExplainChips(false)
        append('assistant', TUTOR_CHAT_COPY.triagePickGoal(result.topicHint))
        return
      }
      if (result.kind === 'C') {
        setAnchorQuery(result.broadTerm)
        setTriageChips(result.chips)
        setPostExplainChips(false)
        append('assistant', TUTOR_CHAT_COPY.triagePickAngle(result.broadTerm))
        return
      }
      setTriageChips([])
      setPostExplainChips(Boolean(lastExplain))
      append('assistant', result.clarifyPromptRu)
    },
    [append, lastExplain, runExplain]
  )

  const handleUserTurn = useCallback(
    (rawText: string, options?: { userAlreadyInThread?: boolean }) => {
      const text = rawText.trim()
      if (!text) return

      if (followUpHopState.hop !== 0 || followUpHopState.awaitingHop2) {
        setFollowUpHopState((s) => nextFollowUpHopState(s, { type: 'userTypedOwn' }))
      }

      const userAlreadyInThread = options?.userAlreadyInThread === true
      let threadForTurn = thread
      if (!userAlreadyInThread) {
        const userMsg = { id: nextId(), role: 'user' as const, text }
        threadForTurn = [...thread, userMsg]
        setThread(threadForTurn)
      }

      // Pending B/C free-text: gate raw text first (combined anchor must not bypass hard-stop)
      if (triageChips.length > 0 && anchorQuery) {
        const pendingGate = matchTutorGate(text)
        if (pendingGate) {
          setTriageChips([])
          if (lastExplain) setPostExplainChips(true)
          append('assistant', pendingGate.messageRu)
          return
        }
        const pending = resolvePendingTriageFollowUp(anchorQuery, text)
        if (pending.kind === 'explain') {
          setTriageChips([])
          setAnchorQuery(pending.query)
          void runExplain(pending.query)
          return
        }
        setTriageChips([])
        const pendingRoute = routeTutorTurn({ query: text, lastExplain: null })
        if (pendingRoute.kind === 'stop') {
          if (lastExplain) setPostExplainChips(true)
          append('assistant', pendingRoute.gate.messageRu)
          return
        }
        applyTriage(localTutorTriage(pendingRoute.query))
        return
      }

      const route = routeTutorTurn({ query: text, lastExplain })
      if (route.kind === 'stop') {
        setTriageChips([])
        if (lastExplain) setPostExplainChips(true)
        append('assistant', route.gate.messageRu)
        return
      }
      if (route.kind === 'continue' && lastExplain) {
        setTriageChips([])
        void runExplain(
          route.query,
          buildTutorTopicContext({ answer: lastExplain, thread: threadForTurn })
        )
        return
      }
      // first | switch → strict FAQ (id/exact/alias/multi-needle) then triage
      if (featureFlags.tutorFaqPoolV1) {
        const hit = matchLocalFaq(route.query, session?.settings.level ?? 'a2')
        if (hit) {
          const canon = hit.entry.questionRu
          setTriageChips([])
          setAnchorQuery(canon)
          // Rewrite bubble only on exact-ish hits — never silent topic swap on needle
          const rewriteBubble =
            hit.reason === 'id' || hit.reason === 'exact' || hit.reason === 'alias'
          if (rewriteBubble && (!userAlreadyInThread || text !== canon)) {
            setThread((prev) => {
              const next = [...prev]
              for (let i = next.length - 1; i >= 0; i -= 1) {
                if (next[i]!.role === 'user') {
                  next[i] = { ...next[i]!, text: canon }
                  break
                }
              }
              return next
            })
          }
          void runExplain(canon)
          return
        }
      }
      applyTriage(localTutorTriage(route.query))
    },
    [
      anchorQuery,
      append,
      applyTriage,
      followUpHopState.awaitingHop2,
      followUpHopState.hop,
      lastExplain,
      nextId,
      runExplain,
      session?.settings.level,
      thread,
      triageChips.length,
    ]
  )

  useEffect(() => {
    if (!pendingTriageQuery || pendingTriageDoneRef.current) return
    pendingTriageDoneRef.current = true
    const q = pendingTriageQuery
    setPendingTriageQuery(null)
    handleUserTurn(q, { userAlreadyInThread: true })
  }, [handleUserTurn, pendingTriageQuery])

  useEffect(() => {
    if (!autoSubmitInitial || embeddedInMenu) return
    if (autoSubmitDoneRef.current) return
    const text = initialPrefill.trim()
    if (!text) return
    if (pendingTriageDoneRef.current) return
    autoSubmitDoneRef.current = true
    setDraftSynced('')
    voice.setDraftText('')
    handleUserTurn(text, { userAlreadyInThread: false })
  }, [
    autoSubmitInitial,
    embeddedInMenu,
    handleUserTurn,
    initialPrefill,
    setDraftSynced,
    voice,
  ])

  const handleSubmit = useCallback(() => {
    const text = draft.trim()
    if (!text || busy || isTutorMicroLocked(microPhase) || voice.isVoiceActive || voice.listening) return

    if (embeddedInMenu && onPromoteToSpace && !lastExplain) {
      setDraftSynced('')
      if (promoteWithUserQuery(text)) return
    }

    setDraftSynced('')
    handleUserTurn(text, { userAlreadyInThread: false })
  }, [
    busy,
    draft,
    embeddedInMenu,
    handleUserTurn,
    lastExplain,
    microPhase,
    onPromoteToSpace,
    promoteWithUserQuery,
    setDraftSynced,
    voice.isVoiceActive,
    voice.listening,
  ])

  const handleExampleSelect = useCallback(
    (item: TutorIdleExampleItem) => {
      const trimmed = item.questionRu.trim()
      if (!trimmed || busy || isTutorMicroLocked(microPhase) || voice.isVoiceActive || voice.listening) {
        return
      }
      // Same substitution as pre-FAQ: promote → pendingTriageQuery → handleUserTurn (not pendingFaqId shortcut).
      if (embeddedInMenu && onPromoteToSpace) {
        if (promoteWithUserQuery(trimmed)) return
      }
      setDraftSynced('')
      handleUserTurn(trimmed, { userAlreadyInThread: false })
    },
    [
      busy,
      embeddedInMenu,
      handleUserTurn,
      microPhase,
      onPromoteToSpace,
      promoteWithUserQuery,
      setDraftSynced,
      voice.isVoiceActive,
      voice.listening,
    ]
  )

  const handleChipSelect = useCallback(
    (chipId: string) => {
      if (chipId.startsWith('cs:')) {
        const candId = chipId.slice(3)
        const candidate = cheatsheetChooseRef.current.find((c) => c.id === candId)
        if (!candidate || !session || busy) return
        append('user', candidate.title)
        setTriageChips([])
        cheatsheetChooseRef.current = []
        void (async () => {
          const result = await session.openCheatsheetCandidate(candidate)
          if (result.kind === 'needs_choose') {
            cheatsheetChooseRef.current = result.candidates
            setTriageChips(
              result.candidates.map((c) => ({
                id: `cs:${c.id}`,
                labelRu: c.title,
              }))
            )
            append('assistant', TUTOR_CHAT_COPY.cheatsheetChoose)
            return
          }
          if (result.kind !== 'opened') append('assistant', result.message)
        })()
        return
      }
      const chip = triageChips.find((c) => c.id === chipId)
      if (!chip || busy) return
      const combined = anchorQuery ? `${anchorQuery}: ${chip.labelRu}` : chip.labelRu
      append('user', chip.labelRu)
      setTriageChips([])
      setAnchorQuery(combined)
      void runExplain(combined)
    },
    [anchorQuery, append, busy, runExplain, session, triageChips]
  )

  const pauseMicroReveal = useCallback(
    async (signal: AbortSignal) => {
      if (prefersReducedMotion) return
      setMicroTypingVisible(false)
      await waitTutorMicroReveal(TUTOR_MICRO_BUBBLE_HOLD_MS, signal)
      setMicroTypingVisible(true)
      await waitTutorMicroReveal(TUTOR_MICRO_TYPING_HOLD_MS, signal)
      setMicroTypingVisible(false)
    },
    [prefersReducedMotion]
  )

  const revealMicroOpening = useCallback(
    async (pack: TutorMicroPack) => {
      const signal = beginMicroReveal()
      const firstPrompt = pack.items[0]?.promptRu
      if (!firstPrompt) return

      setMicroPack(pack)
      setMicroIndex(0)
      setMicroCorrectCount(0)
      setMicroReveal(null)
      setMicroPhase('revealing')
      setPostExplainChips(false)
      setTriageChips([])

      try {
        if (prefersReducedMotion) {
          append('assistant', TUTOR_CHAT_COPY.microStart)
          append('assistant', firstPrompt)
          setMicroPhase('active')
          return
        }

        setMicroTypingVisible(true)
        await waitTutorMicroReveal(TUTOR_MICRO_TYPING_HOLD_MS, signal)
        setMicroTypingVisible(false)
        append('assistant', TUTOR_CHAT_COPY.microStart)
        await pauseMicroReveal(signal)
        append('assistant', firstPrompt)
        setMicroPhase('active')
      } catch (error) {
        if (isTutorMicroRevealAborted(error)) return
        throw error
      } finally {
        setMicroTypingVisible(false)
      }
    },
    [append, beginMicroReveal, pauseMicroReveal, prefersReducedMotion]
  )

  const startMicro = useCallback(async () => {
    if (!lastExplain) {
      append('assistant', TUTOR_CHAT_COPY.microUnavailable)
      return
    }
    if (busy || isTutorMicroLocked(microPhase)) return

    const failSoft = (unsuitable: boolean) => {
      append('assistant', unsuitable ? TUTOR_CHAT_COPY.microUnsuitable : TUTOR_CHAT_COPY.microFailed)
      setPostExplainChips(true)
      setMicroPhase('idle')
      setMicroReveal(null)
      setMicroTypingVisible(false)
    }

    if (!featureFlags.tutorMicroLlmV1) {
      failSoft(true)
      return
    }

    setBusy(true)
    setLoadingMicro(true)
    setMicroTailMode(true)
    setPostExplainChips(false)
    try {
      const response = await fetch('/api/tutor-micro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: anchorQuery || lastExplain.title,
          answer: lastExplain,
          audience: session?.settings.audience ?? 'adult',
          level: session?.settings.level ?? 'a2',
          provider: session?.settings.provider ?? 'openai',
          openAiChatPreset: session?.settings.openAiChatPreset,
        }),
      })
      let llmPack: TutorMicroPack | null | undefined
      if (response.ok) {
        const data = (await response.json()) as { micro?: TutorMicroPack | null }
        llmPack = data.micro === undefined ? undefined : data.micro
      }
      const resolved = resolveTutorMicroPack({
        answer: lastExplain,
        llmPack: llmPack === undefined ? undefined : llmPack,
      })
      if (!resolved.ok) {
        failSoft(llmPack === null)
        return
      }
      setBusy(false)
      setLoadingMicro(false)
      await revealMicroOpening(resolved.pack)
    } catch (error) {
      if (isTutorMicroRevealAborted(error)) return
      failSoft(false)
    } finally {
      setBusy(false)
      setLoadingMicro(false)
    }
  }, [anchorQuery, append, busy, lastExplain, microPhase, revealMicroOpening, session])

  const finishMicro = useCallback(
    (pack: TutorMicroPack, correctCount: number) => {
      setMicroReveal(null)
      setMicroPhase('finale')
      setMicroPack(pack)
      const total = pack.items.length
      const band = bandFromMicroScore(correctCount, total)
      const audience = session?.settings.audience === 'child' ? 'child' : 'adult'
      let finaleText =
        band === 'strong'
          ? buildMicroStrongFinaleText({
              correct: correctCount,
              total,
              audience,
              rememberRu: lastExplain?.rememberRu,
            })
          : band === 'mid'
            ? TUTOR_CHAT_COPY.microFinaleMid(correctCount, total)
            : TUTOR_CHAT_COPY.microFinaleWeak(correctCount, total)
      if (band !== 'strong' && lastExplain?.rememberRu) {
        finaleText = `${finaleText}\n\n${lastExplain.rememberRu}`
      }
      append('assistant', finaleText)
      setPostExplainChips(false)
      setMicroTypingVisible(false)
      const topicKey = lastExplain?.topicAnchor.canonicalKey?.trim()
      if (topicKey) onMicroFinale?.(topicKey)
    },
    [append, lastExplain, onMicroFinale, session]
  )

  const answerMicro = useCallback(
    (optionIndex: number) => {
      if (microPhase !== 'active' || !microPack || !lastExplain) return
      if (answeringMicroRef.current) return
      answeringMicroRef.current = true

      const item: TutorMicroItem | undefined = microPack.items[microIndex]
      if (!item) {
        answeringMicroRef.current = false
        return
      }

      const chosen = item.options[optionIndex] ?? ''
      append('user', chosen)
      const correct = optionIndex === item.correctIndex
      const newCorrectCount = correct ? microCorrectCount + 1 : microCorrectCount
      if (correct) {
        setMicroCorrectCount(newCorrectCount)
        append('assistant', TUTOR_CHAT_COPY.microCorrect)
      } else {
        const right = item.options[item.correctIndex] ?? ''
        append('assistant', `${TUTOR_CHAT_COPY.microWrong} ${right}`)
        recordTutorMicroWrongSignal({
          skillTagId: item.skillTagId,
          topicTitle: lastExplain.topicAnchor.title || lastExplain.title,
          userAnswer: chosen,
          correctAnswer: right,
          canonicalKey: lastExplain.topicAnchor.canonicalKey,
          lessonIdHint: lastExplain.topicAnchor.lessonIdHint,
        })
      }

      const next = microIndex + 1
      const pack = microPack

      void (async () => {
        try {
          setMicroReveal({ chosenText: chosen, correct })
          setMicroPhase('revealing')
          const signal = beginMicroReveal()
          await pauseMicroReveal(signal)

          if (next >= pack.items.length) {
            finishMicro(pack, newCorrectCount)
            return
          }

          setMicroReveal(null)
          setMicroIndex(next)
          append('assistant', pack.items[next]!.promptRu)
          setMicroPhase('active')
        } catch (error) {
          if (isTutorMicroRevealAborted(error)) return
        } finally {
          setMicroTypingVisible(false)
          answeringMicroRef.current = false
        }
      })()
    },
    [
      append,
      beginMicroReveal,
      finishMicro,
      lastExplain,
      microCorrectCount,
      microIndex,
      microPack,
      microPhase,
      pauseMicroReveal,
    ]
  )

  const cheatsheetChipVisible =
    lastExplain != null &&
    lastExplain.cheatsheetVisibility !== 'hidden' &&
    (session?.referenceEnabled ?? true)

  const cheatsheetChipAvailable = useMemo(
    () => (lastExplain && cheatsheetChipVisible ? peekTutorCheatsheetAvailable(lastExplain) : false),
    [cheatsheetChipVisible, lastExplain]
  )

  const cheatsheetChip = useMemo((): TutorComposerChip | null => {
    if (!cheatsheetChipVisible) return null
    return {
      id: 'cheatsheet',
      labelRu: TUTOR_CHAT_COPY.chipCheatsheet,
      disabled: !cheatsheetChipAvailable,
      disabledTitle: TUTOR_CHAT_COPY.cheatsheetChipDisabledTitle,
    }
  }, [cheatsheetChipAvailable, cheatsheetChipVisible])

  const microChipVisible =
    lastExplain != null &&
    canOfferTutorMicro(lastExplain, {
      llmEnabled: featureFlags.tutorMicroLlmV1,
    })

  const referenceReturnChipVisible =
    showReferenceReturnChip &&
    Boolean(onReturnToReference) &&
    postExplainChips &&
    microPhase !== 'revealing' &&
    microPhase !== 'active'

  const referenceReturnChip = useMemo((): TutorComposerChip | null => {
    if (!referenceReturnChipVisible) return null
    return {
      id: 'return_reference',
      labelRu: TUTOR_CHAT_COPY.chipReturnReference,
    }
  }, [referenceReturnChipVisible])

  const finaleChips: TutorComposerChip[] = [
    ...(microChipVisible
      ? [{ id: 'again', labelRu: TUTOR_CHAT_COPY.chipAgain } satisfies TutorComposerChip]
      : []),
    ...(cheatsheetChip ? [cheatsheetChip] : []),
    ...(referenceReturnChip && microPhase === 'finale' ? [referenceReturnChip] : []),
    ...(onDone ? [{ id: 'done', labelRu: TUTOR_CHAT_COPY.chipDone } satisfies TutorComposerChip] : []),
  ]

  const hasMicroReveal = microReveal != null
  const showMicroOptions = shouldShowTutorMicroOptions(microPhase, hasMicroReveal)
  const activeMicroItem = showMicroOptions ? microPack?.items[microIndex] : null
  const microOptionChips: TutorComposerChip[] =
    activeMicroItem?.options.map((labelRu, index) => ({
      id: `opt_${index}`,
      labelRu,
    })) ?? []

  const primaryChips: TutorComposerChip[] =
    microPhase === 'finale'
      ? finaleChips
      : showMicroOptions
        ? microOptionChips
        : triageChips.length > 0
          ? triageChips
          : postExplainChips
            ? [
                ...(microChipVisible
                  ? [{ id: 'micro', labelRu: TUTOR_CHAT_COPY.chipMicro } satisfies TutorComposerChip]
                  : []),
                ...(cheatsheetChip ? [cheatsheetChip] : []),
                ...(referenceReturnChip ? [referenceReturnChip] : []),
              ]
            : triageChips

  const handlePrimaryChip = useCallback(
    (chipId: string) => {
      if (microPhase === 'revealing') return

      if (chipId === 'follow_up') {
        const text = (followUpChip?.submitText ?? followUpChip?.labelRu)?.trim()
        if (
          !text ||
          !lastExplain ||
          busy ||
          isTutorMicroLocked(microPhase) ||
          voice.isVoiceActive ||
          voice.listening
        ) {
          return
        }
        const hop1WasExit = text === FOLLOW_UP_CHIP_BANK.exit
        setFollowUpHopState((s) => nextFollowUpHopState(s, { type: 'tapFollowUp', hop1WasExit }))
        setDraftSynced('')
        const userMsg: ThreadMessage = { id: nextId(), role: 'user', text }
        const threadForTurn = [...thread, userMsg]
        setThread(threadForTurn)

        // Full sibling FAQ chip → explain without deepen (avoids LLM echo).
        // Angles / exit / compress miss FAQ → keep continue deepen.
        const level = session?.settings.level ?? 'a2'
        if (featureFlags.tutorFaqPoolV1) {
          const hit = matchLocalFaq(text, level)
          if (hit) {
            const canon = hit.entry.questionRu
            setTriageChips([])
            setAnchorQuery(canon)
            const rewriteBubble =
              hit.reason === 'id' || hit.reason === 'exact' || hit.reason === 'alias'
            if (rewriteBubble && text !== canon) {
              setThread((prev) => {
                const next = [...prev]
                for (let i = next.length - 1; i >= 0; i -= 1) {
                  if (next[i]!.role === 'user') {
                    next[i] = { ...next[i]!, text: canon }
                    break
                  }
                }
                return next
              })
            }
            void runExplain(canon)
            return
          }
        }

        void runExplain(
          text,
          buildTutorTopicContext({ answer: lastExplain, thread: threadForTurn })
        )
        return
      }

      if (microPhase === 'active') {
        if (!chipId.startsWith('opt_')) return
        const idx = Number(chipId.slice(4))
        if (!Number.isFinite(idx)) return
        answerMicro(idx)
        return
      }

      if (microPhase === 'finale') {
        if (chipId === 'again') {
          void startMicro()
          return
        }
        if (chipId === 'return_reference') {
          abortMicro()
          clearTutorReturnContext()
          onReturnToReference?.()
          return
        }
        if (chipId === 'done') {
          abortMicro()
          clearTutorReturnContext()
          onDone?.()
          return
        }
        if (chipId === 'cheatsheet') {
          if (!cheatsheetChipAvailable) return
          if (!lastExplain || !session) {
            append('assistant', TUTOR_CHAT_COPY.cheatsheetUnavailable)
            return
          }
          if (cheatsheetInflightRef.current) return
          cheatsheetInflightRef.current = true
          void (async () => {
            try {
              const result = await session.openCheatsheet({
                answer: lastExplain,
                snapshot: buildSnapshot(),
              })
              if (result.kind === 'opened') return
              if (result.kind === 'needs_choose') {
                cheatsheetChooseRef.current = result.candidates
                setTriageChips(
                  result.candidates.map((c) => ({
                    id: `cs:${c.id}`,
                    labelRu: c.title,
                  }))
                )
                append('assistant', TUTOR_CHAT_COPY.cheatsheetChoose)
                return
              }
              append('assistant', result.message)
            } finally {
              cheatsheetInflightRef.current = false
            }
          })()
          return
        }
        return
      }

      if (chipId.startsWith('cs:') || !postExplainChips) {
        handleChipSelect(chipId)
        return
      }
      if (chipId === 'micro') {
        void startMicro()
        return
      }
      if (chipId === 'return_reference') {
        onReturnToReference?.()
        return
      }
      if (chipId === 'cheatsheet') {
        if (!cheatsheetChipAvailable) return
        if (!lastExplain || !session) {
          append('assistant', TUTOR_CHAT_COPY.cheatsheetUnavailable)
          return
        }
        if (cheatsheetInflightRef.current) return
        cheatsheetInflightRef.current = true
        void (async () => {
          try {
            const result = await session.openCheatsheet({
              answer: lastExplain,
              snapshot: buildSnapshot(),
            })
            if (result.kind === 'opened') return
            if (result.kind === 'needs_choose') {
              cheatsheetChooseRef.current = result.candidates
              setTriageChips(
                result.candidates.map((c) => ({
                  id: `cs:${c.id}`,
                  labelRu: c.title,
                }))
              )
              append('assistant', TUTOR_CHAT_COPY.cheatsheetChoose)
              return
            }
            append('assistant', result.message)
          } finally {
            cheatsheetInflightRef.current = false
          }
        })()
      }
    },
    [
      abortMicro,
      answerMicro,
      append,
      buildSnapshot,
      busy,
      cheatsheetChipAvailable,
      followUpChip,
      handleChipSelect,
      lastExplain,
      microPhase,
      nextId,
      onDone,
      onReturnToReference,
      postExplainChips,
      runExplain,
      session,
      setDraftSynced,
      startMicro,
      thread,
      voice.isVoiceActive,
      voice.listening,
    ]
  )

  const isMicroLocked = isTutorMicroLocked(microPhase)
  const composerLocked = busy || isMicroLocked
  const chipsDisabled = busy || microTypingVisible || microPhase === 'revealing'
  const chipsMode = showMicroOptions ? 'micro' : 'nav'
  const threadFollowUpChip = chipsMode === 'micro' ? null : followUpChip
  const microChoiceFrozen = isTutorMicroChoiceFrozen(microPhase, hasMicroReveal)
  const microWrongChoiceText =
    microReveal && !microReveal.correct ? microReveal.chosenText : null
  const microChipsResetKey = resolveTutorMicroChipsResetKey(
    microPhase,
    microPack?.items[microIndex]?.id,
    microIndex,
    hasMicroReveal
  )
  const threadComposerStackLayout = getChatComposerStackLayout(showMicroOptions)
  const threadComposerStackStyle = threadComposerStackLayout.style
    ? {
        ...threadComposerStackLayout.style,
        paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
      }
    : undefined
  const composerValue = voice.isVoiceActive || voice.listening ? voice.displayText : draft
  const showVoiceOverlay = voice.isVoiceActive && composerValue.length > 0
  const rawVoiceStatusMessage = voice.voiceStatusMessage ?? ''
  const filteredVoiceStatus = shouldHideVoiceStatusMessage(rawVoiceStatusMessage)
    ? ''
    : rawVoiceStatusMessage
  const showVoiceStatusBelow =
    Boolean(filteredVoiceStatus) && (!isIosDeviceClient || isHardVoiceErrorMessage(filteredVoiceStatus))
  const iosChromeVoiceStatusMessage = !isIosChromeClient
    ? null
    : voice.voicePhase === 'recording'
      ? 'Голосовой ввод...'
      : voice.voicePhase === 'finalizing'
        ? 'Распознаю речь...'
        : voice.voicePhase === 'error'
          ? rawVoiceStatusMessage || null
          : null
  const voiceStatusIsDanger =
    voice.voicePhase === 'error' || isHardVoiceErrorMessage(filteredVoiceStatus || rawVoiceStatusMessage)

  return (
    <div
      className={`relative font-sans flex min-h-0 flex-1 flex-col ${
        isIdle
          ? 'bg-transparent'
          : 'bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]'
      }`}
      data-testid="tutor-chat-panel"
    >
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.target.value = ''
          handlePhotoFile(file)
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.target.value = ''
          handlePhotoFile(file)
        }}
      />
      {attachMenuOpen ? (
        <>
          <button
            type="button"
            className="absolute inset-0 z-20 bg-black/25"
            aria-label={TUTOR_CHAT_COPY.photoAttachCancel}
            onClick={closeAttachMenu}
          />
          {isMobileAttach ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={TUTOR_CHAT_COPY.photoAttachMenuAria}
              className="absolute inset-x-0 bottom-0 z-20 overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--menu-card-bg,var(--chat-composer-bg))] shadow-lg"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center justify-center border-b border-[var(--border)] px-4 py-3 text-[15px] font-medium text-[var(--text)] touch-manipulation"
                onClick={openCameraInput}
              >
                {TUTOR_CHAT_COPY.photoTake}
              </button>
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center justify-center border-b border-[var(--border)] px-4 py-3 text-[15px] font-medium text-[var(--text)] touch-manipulation"
                onClick={openGalleryInput}
              >
                {TUTOR_CHAT_COPY.photoPick}
              </button>
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center justify-center px-4 py-3 text-[15px] font-medium text-[var(--text-muted)] touch-manipulation"
                onClick={closeAttachMenu}
              >
                {TUTOR_CHAT_COPY.photoAttachCancel}
              </button>
            </div>
          ) : (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={TUTOR_CHAT_COPY.photoAttachMenuAria}
              className="absolute bottom-[4.5rem] right-3 z-20 min-w-[12rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--menu-card-bg,var(--chat-composer-bg))] shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center px-3 py-2 text-left text-[14px] font-medium text-[var(--text)] touch-manipulation hover:bg-[var(--surface-hover,transparent)]"
                onClick={openCameraInput}
              >
                {TUTOR_CHAT_COPY.photoTake}
              </button>
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center px-3 py-2 text-left text-[14px] font-medium text-[var(--text)] touch-manipulation hover:bg-[var(--surface-hover,transparent)]"
                onClick={openGalleryInput}
              >
                {TUTOR_CHAT_COPY.photoPick}
              </button>
            </div>
          )}
        </>
      ) : null}
      <div className={`flex min-h-0 flex-1 flex-col ${isIdle ? 'px-0 py-0' : 'chat-shell-x py-2 sm:py-3'}`}>
        <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${isIdle ? 'max-w-none' : 'max-w-[29rem]'}`}>
          {isIdle ? (
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
              {/* Menu root bleeds (-mx-3); keep examples aligned with chat dock px-2.5. */}
              <div
                className={`flex min-h-0 flex-1 flex-col pt-1 ${embeddedInMenu ? 'px-2.5' : 'px-0.5'}`}
              >
                <TutorIdleMenu
                  bullets={idleBullets}
                  examples={idleExamples}
                  onExampleSelect={handleExampleSelect}
                />
              </div>
              {/* Same dock inset as Chat: px-2.5 + paddingBottom 0.625rem (menu bleed via -mx-3 -mb-3).
                  No border-t in menu: shell divider has nothing to separate and reads as a light seam. */}
              <DialogComposerStack
                className={`${CHAT_COMPOSER_STACK_TOP_CLASS}${embeddedInMenu ? ' border-t-0' : ''}`}
                contentMaxWidthClass={embeddedInMenu ? 'max-w-none' : undefined}
                style={{
                  paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
                }}
              >
                <TutorComposer
                  value={composerValue}
                  onChange={setDraftSynced}
                  onSubmit={handleSubmit}
                  placeholder={composerPlaceholder}
                  chips={[]}
                  onChipSelect={handlePrimaryChip}
                  chipsMode="nav"
                  composerLocked={composerLocked}
                  chipsDisabled={chipsDisabled}
                  readOnly={voice.isInputLocked}
                  micDisabled={false}
                  listening={voice.listening}
                  finalizing={voice.voicePhase === 'finalizing'}
                  isVoiceActive={voice.isVoiceActive}
                  micVisualState={voice.micVisualState}
                  onMicClick={handleMicClick}
                  paperclipDisabled={false}
                  onPaperclipClick={handlePaperclipClick}
                  showVoiceOverlay={showVoiceOverlay}
                  draftBeforeVoiceText={voice.draftBeforeVoiceText}
                  livePreviewText={voice.livePreviewText}
                  voiceWebMetricsClient={voiceWebMetricsClient}
                  iosChromeVoiceStatusMessage={iosChromeVoiceStatusMessage}
                  voiceStatusMessage={showVoiceStatusBelow ? filteredVoiceStatus : null}
                  voiceStatusIsDanger={voiceStatusIsDanger}
                  menuDock={embeddedInMenu}
                />
              </DialogComposerStack>
            </div>
          ) : (
            <div
              className="glass-surface flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
              style={{ boxShadow: 'var(--chat-shell-shadow)' }}
            >
              <DialogGlassScrollHost>
                <div
                  ref={scrollRef}
                  className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3`}
                >
                  {thread.map((msg, index) => {
                    if (!feedTailEnter.isMessageVisible(msg.id)) return null
                    const position = getBubblePosition(
                      thread[index - 1]?.role,
                      msg.role,
                      thread[index + 1]?.role
                    )
                    const isBubbleEnd =
                      index === thread.length - 1 || thread[index + 1]?.role !== msg.role
                    const enterClass =
                      msg.role === 'user'
                        ? feedTailEnter.getUserEnterClass(msg.id)
                        : feedTailEnter.getAssistantEnterClass(msg.id)
                    return (
                      <ChatBubbleFrame
                        key={msg.id}
                        role={msg.role}
                        position={position}
                        data-message-index={index}
                        data-role={msg.role}
                        rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                        className={enterClass}
                        onAnimationEnd={(event) => handleTutorFeedAnimationEnd(msg.id, event)}
                      >
                        <p className="min-w-0 whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                          {msg.text}
                        </p>
                      </ChatBubbleFrame>
                    )
                  })}
                  {busy || microTypingVisible ? (
                    <div
                      dir="ltr"
                      className={CHAT_FEED_SERVICE_STATUS_ROW_CLASS}
                      data-feed-service-status
                    >
                      <EngvoFeedServiceTypingText
                        text={
                          loadingMicro
                            ? TUTOR_CHAT_COPY.loadingMicro
                            : microTypingVisible
                              ? TUTOR_CHAT_COPY.typingStatus
                              : TUTOR_CHAT_COPY.loadingExplain
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </DialogGlassScrollHost>

              <DialogComposerStack
                className={threadComposerStackLayout.verticalClass}
                style={threadComposerStackStyle}
              >
                <TutorComposer
                  value={composerValue}
                  onChange={setDraftSynced}
                  onSubmit={handleSubmit}
                  placeholder={composerPlaceholder}
                  chips={primaryChips}
                  onChipSelect={handlePrimaryChip}
                  followUpChip={threadFollowUpChip}
                  chipsMode={chipsMode}
                  chipsResetKey={microChipsResetKey}
                  microChoiceFrozen={microChoiceFrozen}
                  wrongChoiceText={microWrongChoiceText}
                  composerLocked={composerLocked}
                  chipsDisabled={chipsDisabled}
                  readOnly={voice.isInputLocked}
                  micDisabled={false}
                  listening={voice.listening}
                  finalizing={voice.voicePhase === 'finalizing'}
                  isVoiceActive={voice.isVoiceActive}
                  micVisualState={voice.micVisualState}
                  onMicClick={handleMicClick}
                  paperclipDisabled={false}
                  onPaperclipClick={handlePaperclipClick}
                  showVoiceOverlay={showVoiceOverlay}
                  draftBeforeVoiceText={voice.draftBeforeVoiceText}
                  livePreviewText={voice.livePreviewText}
                  voiceWebMetricsClient={voiceWebMetricsClient}
                  iosChromeVoiceStatusMessage={iosChromeVoiceStatusMessage}
                  voiceStatusMessage={showVoiceStatusBelow ? filteredVoiceStatus : null}
                  voiceStatusIsDanger={voiceStatusIsDanger}
                />
              </DialogComposerStack>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
