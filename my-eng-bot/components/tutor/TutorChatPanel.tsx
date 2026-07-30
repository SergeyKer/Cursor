'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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
} from '@/lib/chatComposerMetrics'
import { recordTutorMicroWrongSignal } from '@/lib/learningMemory/record'
import { LESSON_SCROLL_VIEWPORT_CLASS, scheduleScrollAfterLayout } from '@/lib/lessonFeedScroll'
import { buildTutorMicroPackFromExplain } from '@/lib/tutor/buildMicroPack'
import { buildTutorTopicContext } from '@/lib/tutor/buildTopicContext'
import { bandFromMicroScore } from '@/lib/tutor/microScore'
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
import { localTutorTriage, resolvePendingTriageFollowUp } from '@/lib/tutor/localTriage'
import type { TutorSchoolPhotoResult } from '@/lib/tutor/normalizeSchoolPhoto'
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
  TUTOR_CHAT_COPY,
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

type ThreadRole = 'user' | 'assistant'

type ThreadMessage = {
  id: string
  role: ThreadRole
  text: string
  explain?: TutorExplainAnswer
}

type MicroPhase = 'idle' | 'active' | 'finale'

export type TutorChatPanelProps = {
  initialPrefill?: string
  /** Готово → меню Уроки summary. */
  onDone?: () => void
  /** Idle lives in slide-out menu; first question promotes to dialog-space. */
  embeddedInMenu?: boolean
  /** Called after stash when leaving menu idle for space. */
  onPromoteToSpace?: () => void
  /** MyPlan: submit initialPrefill once on mount (space only). */
  autoSubmitInitial?: boolean
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
}: TutorChatPanelProps) {
  const session = useTutorSessionOptional()
  const [draft, setDraft] = useState(initialPrefill)
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [triageChips, setTriageChips] = useState<TutorComposerChip[]>([])
  const [anchorQuery, setAnchorQuery] = useState<string | null>(null)
  const [postExplainChips, setPostExplainChips] = useState(false)
  const [lastExplain, setLastExplain] = useState<TutorExplainAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const [microPhase, setMicroPhase] = useState<MicroPhase>('idle')
  const [microPack, setMicroPack] = useState<TutorMicroPack | null>(null)
  const [microIndex, setMicroIndex] = useState(0)
  const [microCorrectCount, setMicroCorrectCount] = useState(0)
  const [pendingTriageQuery, setPendingTriageQuery] = useState<string | null>(null)
  const [isIosDeviceClient, setIsIosDeviceClient] = useState(false)
  const [isIosChromeClient, setIsIosChromeClient] = useState(false)
  const [voiceWebMetricsClient, setVoiceWebMetricsClient] = useState(false)
  const [isMobileAttach, setIsMobileAttach] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const idBase = useId()
  const seqRef = useRef(0)
  const restoredRef = useRef(false)
  const pendingTriageDoneRef = useRef(false)
  const autoSubmitDoneRef = useRef(false)

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

  const composerPlaceholder = useMemo(
    () => tutorComposerPlaceholder(session?.settings.audience === 'child' ? 'child' : 'adult'),
    [session?.settings.audience]
  )
  const isIdle = thread.length === 0 && !busy

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
    if (initialPrefill.trim()) {
      setDraft(initialPrefill)
      voice.setDraftText(initialPrefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on prefill change
  }, [initialPrefill])

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

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const snap = consumeTutorReturnContext()
    if (!snap) return
    setDraft(snap.draft)
    voice.setDraftText(snap.draft)
    setAnchorQuery(snap.anchorQuery)
    setPostExplainChips(snap.postExplainChips)
    setThread(snap.thread.map((m) => ({ id: m.id, role: m.role, text: m.text })))
    if (snap.lastExplain) {
      setLastExplain(snap.lastExplain)
    }
    if (snap.pendingTriageQuery?.trim()) {
      setPendingTriageQuery(snap.pendingTriageQuery.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    return scheduleScrollAfterLayout(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [thread, busy])

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
    return {
      draft,
      anchorQuery,
      postExplainChips,
      thread: thread.map(({ id, role, text }) => ({ id, role, text })),
      ...(lastExplain ? { lastExplain } : {}),
    }
  }, [anchorQuery, draft, lastExplain, postExplainChips, thread])

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
        thread: [...prior.map(({ id, role, text: t }) => ({ id, role, text: t })), userMsg],
        pendingTriageQuery: trimmed,
        ...(lastExplain ? { lastExplain } : {}),
      })
      onPromoteToSpace()
      return true
    },
    [lastExplain, nextId, onPromoteToSpace, thread]
  )

  const abortMicro = useCallback(() => {
    setMicroPhase('idle')
    setMicroPack(null)
    setMicroIndex(0)
    setMicroCorrectCount(0)
  }, [])

  const runExplain = useCallback(
    async (query: string, topicContext?: TutorTopicContext | null) => {
      abortMicro()
      setBusy(true)
      const hadLastExplain = lastExplain != null
      const prevCanonicalKey = lastExplain?.topicAnchor.canonicalKey
      try {
        const response = await fetch('/api/tutor-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            ...(topicContext ? { topicContext } : {}),
            audience: session?.settings.audience ?? 'adult',
            level: session?.settings.level ?? 'a2',
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
          return
        }
        if (data.scope === 'out_of_scope') {
          append('assistant', data.messageRu || TUTOR_CHAT_COPY.outOfScopeFallback)
          setPostExplainChips(hadLastExplain)
          return
        }
        if (!data.answer) {
          append('assistant', data.userMessage || TUTOR_CHAT_COPY.explainFailed)
          setPostExplainChips(hadLastExplain)
          return
        }
        const answer = data.answer
        setLastExplain(answer)
        setAnchorQuery(answer.topicAnchor.title || query)
        setPostExplainChips(true)
        setTriageChips([])
        append('assistant', formatExplainBubble(answer), answer)
        const newKey = answer.topicAnchor.canonicalKey
        if (!prevCanonicalKey || prevCanonicalKey !== newKey) {
          recordTutorCuriosity({
            topicTitle: answer.topicAnchor.title || answer.title,
            questionRu: query,
            canonicalKey: newKey,
          })
        }
      } catch {
        append('assistant', TUTOR_CHAT_COPY.explainFailed)
        setPostExplainChips(hadLastExplain)
      } finally {
        setBusy(false)
      }
    },
    [abortMicro, append, lastExplain, session]
  )

  const analyzeSchoolPhoto = useCallback(
    async (imageDataUrl: string) => {
      if (busy || microPhase === 'active') return
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
    if (busy || microPhase === 'active' || voice.isVoiceActive) return
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
    if (busy || microPhase === 'active' || voice.isVoiceActive) {
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
    if (busy || microPhase === 'active') return
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

      const userAlreadyInThread = options?.userAlreadyInThread === true
      let threadForTurn = thread
      if (!userAlreadyInThread) {
        const userMsg = { id: nextId(), role: 'user' as const, text }
        threadForTurn = [...thread, userMsg]
        setThread(threadForTurn)
      }

      // Pending B/C free-text: combine with anchor or fresh first-hop (no continue into old topic)
      if (triageChips.length > 0 && anchorQuery) {
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
    handleUserTurn(text, { userAlreadyInThread: false })
  }, [
    autoSubmitInitial,
    embeddedInMenu,
    handleUserTurn,
    initialPrefill,
    setDraftSynced,
  ])

  const handleSubmit = useCallback(() => {
    const text = draft.trim()
    if (!text || busy || microPhase === 'active' || voice.isVoiceActive || voice.listening) return

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
      if (!trimmed || busy || microPhase === 'active' || voice.isVoiceActive || voice.listening) {
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
      const chip = triageChips.find((c) => c.id === chipId)
      if (!chip || busy) return
      const combined = anchorQuery ? `${anchorQuery}: ${chip.labelRu}` : chip.labelRu
      append('user', chip.labelRu)
      setTriageChips([])
      setAnchorQuery(combined)
      void runExplain(combined)
    },
    [anchorQuery, append, busy, runExplain, triageChips]
  )

  const startMicro = useCallback(() => {
    if (!lastExplain) {
      append('assistant', TUTOR_CHAT_COPY.microUnavailable)
      return
    }
    const pack = buildTutorMicroPackFromExplain(lastExplain)
    if (!pack) {
      append('assistant', TUTOR_CHAT_COPY.microFailed)
      setPostExplainChips(true)
      return
    }
    setMicroPack(pack)
    setMicroIndex(0)
    setMicroCorrectCount(0)
    setMicroPhase('active')
    setPostExplainChips(false)
    setTriageChips([])
    append('assistant', `${TUTOR_CHAT_COPY.microStart}\n\n${pack.items[0]!.promptRu}`)
  }, [append, lastExplain])

  const finishMicro = useCallback(
    (pack: TutorMicroPack, correctCount: number) => {
      setMicroPhase('finale')
      setMicroPack(pack)
      const total = pack.items.length
      const band = bandFromMicroScore(correctCount, total)
      let finaleText =
        band === 'strong'
          ? TUTOR_CHAT_COPY.microFinaleStrong(correctCount, total)
          : band === 'mid'
            ? TUTOR_CHAT_COPY.microFinaleMid(correctCount, total)
            : TUTOR_CHAT_COPY.microFinaleWeak(correctCount, total)
      if (lastExplain?.rememberRu) {
        finaleText = `${finaleText}\n\n${lastExplain.rememberRu}`
      }
      append('assistant', finaleText)
      setPostExplainChips(false)
    },
    [append, lastExplain]
  )

  const answerMicro = useCallback(
    (optionIndex: number) => {
      if (microPhase !== 'active' || !microPack || !lastExplain) return
      const item: TutorMicroItem | undefined = microPack.items[microIndex]
      if (!item) return
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
      if (next >= microPack.items.length) {
        finishMicro(microPack, newCorrectCount)
        return
      }
      setMicroIndex(next)
      append('assistant', microPack.items[next]!.promptRu)
    },
    [
      append,
      finishMicro,
      lastExplain,
      microCorrectCount,
      microIndex,
      microPack,
      microPhase,
    ]
  )

  const cheatsheetChipVisible =
    lastExplain != null &&
    lastExplain.cheatsheetVisibility !== 'hidden' &&
    (session?.referenceEnabled ?? true)

  const finaleChips: TutorComposerChip[] = [
    { id: 'again', labelRu: TUTOR_CHAT_COPY.chipAgain },
    ...(cheatsheetChipVisible
      ? [{ id: 'cheatsheet', labelRu: TUTOR_CHAT_COPY.chipCheatsheet } satisfies TutorComposerChip]
      : []),
    ...(onDone ? [{ id: 'done', labelRu: TUTOR_CHAT_COPY.chipDone } satisfies TutorComposerChip] : []),
  ]

  const activeMicroItem = microPhase === 'active' ? microPack?.items[microIndex] : null
  const microOptionChips: TutorComposerChip[] =
    activeMicroItem?.options.map((labelRu, index) => ({
      id: `opt_${index}`,
      labelRu,
    })) ?? []

  const primaryChips: TutorComposerChip[] =
    microPhase === 'finale'
      ? finaleChips
      : microPhase === 'active'
        ? microOptionChips
        : postExplainChips
          ? [
              { id: 'micro', labelRu: TUTOR_CHAT_COPY.chipMicro },
              ...(cheatsheetChipVisible
                ? [{ id: 'cheatsheet', labelRu: TUTOR_CHAT_COPY.chipCheatsheet } satisfies TutorComposerChip]
                : []),
            ]
          : triageChips

  const handlePrimaryChip = useCallback(
    (chipId: string) => {
      if (microPhase === 'active') {
        if (!chipId.startsWith('opt_')) return
        const idx = Number(chipId.slice(4))
        if (!Number.isFinite(idx)) return
        answerMicro(idx)
        return
      }

      if (microPhase === 'finale') {
        if (chipId === 'again') {
          startMicro()
          return
        }
        if (chipId === 'done') {
          abortMicro()
          clearTutorReturnContext()
          onDone?.()
          return
        }
        if (chipId === 'cheatsheet') {
          if (!lastExplain || !session) {
            append('assistant', TUTOR_CHAT_COPY.cheatsheetUnavailable)
            return
          }
          const result = session.openCheatsheet({
            answer: lastExplain,
            snapshot: buildSnapshot(),
          })
          if (result.kind !== 'opened') append('assistant', result.message)
          return
        }
        return
      }

      if (!postExplainChips) {
        handleChipSelect(chipId)
        return
      }
      if (chipId === 'micro') {
        startMicro()
        return
      }
      if (chipId === 'cheatsheet') {
        if (!lastExplain || !session) {
          append('assistant', TUTOR_CHAT_COPY.cheatsheetUnavailable)
          return
        }
        const result = session.openCheatsheet({
          answer: lastExplain,
          snapshot: buildSnapshot(),
        })
        if (result.kind !== 'opened') append('assistant', result.message)
      }
    },
    [
      abortMicro,
      answerMicro,
      append,
      buildSnapshot,
      handleChipSelect,
      lastExplain,
      microPhase,
      onDone,
      postExplainChips,
      session,
      startMicro,
    ]
  )

  const composerLocked = busy || microPhase === 'active'
  const chipsDisabled = busy
  const chipsMode = microPhase === 'active' ? 'micro' : 'nav'
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
                <TutorIdleMenu examples={idleExamples} onExampleSelect={handleExampleSelect} />
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
                    const position = getBubblePosition(
                      thread[index - 1]?.role,
                      msg.role,
                      thread[index + 1]?.role
                    )
                    const isBubbleEnd =
                      index === thread.length - 1 || thread[index + 1]?.role !== msg.role
                    return (
                      <ChatBubbleFrame
                        key={msg.id}
                        role={msg.role}
                        position={position}
                        data-message-index={index}
                        data-role={msg.role}
                        rowClassName={isBubbleEnd ? 'mb-2.5' : 'mb-0.5'}
                        className="lesson-enter"
                      >
                        <p className="min-w-0 whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                          {msg.text}
                        </p>
                      </ChatBubbleFrame>
                    )
                  })}
                  {busy ? (
                    <div dir="ltr" className={CHAT_FEED_SERVICE_STATUS_ROW_CLASS}>
                      <EngvoFeedServiceTypingText text={TUTOR_CHAT_COPY.loadingExplain} />
                    </div>
                  ) : null}
                </div>
              </DialogGlassScrollHost>

              <DialogComposerStack
                className={CHAT_COMPOSER_STACK_TOP_CLASS}
                style={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
              >
                <TutorComposer
                  value={composerValue}
                  onChange={setDraftSynced}
                  onSubmit={handleSubmit}
                  placeholder={composerPlaceholder}
                  chips={primaryChips}
                  onChipSelect={handlePrimaryChip}
                  chipsMode={chipsMode}
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
