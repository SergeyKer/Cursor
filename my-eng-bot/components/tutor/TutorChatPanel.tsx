'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import TutorComposer from '@/components/tutor/TutorComposer'
import { useTutorSessionOptional } from '@/components/tutor/TutorSessionProvider'
import {
  CHAT_COMPOSER_STACK_TOP_CLASS,
  DIALOG_COMPOSER_PADDING_BOTTOM,
} from '@/lib/chatComposerMetrics'
import { recordTutorMicroWrongSignal } from '@/lib/learningMemory/record'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { buildTutorMicroPackFromExplain } from '@/lib/tutor/buildMicroPack'
import { chipsFromLabels } from '@/lib/tutor/normalizeTriage'
import { recordTutorCuriosity } from '@/lib/tutor/curiosityStore'
import { localTutorTriage } from '@/lib/tutor/localTriage'
import type { TutorSchoolPhotoResult } from '@/lib/tutor/normalizeSchoolPhoto'
import type {
  TutorComposerChip,
  TutorExplainAnswer,
  TutorMicroItem,
  TutorMicroPack,
  TutorTriageResult,
} from '@/lib/tutor/types'
import {
  consumeTutorReturnContext,
  type TutorReturnContextSnapshot,
} from '@/lib/tutor/tutorReturnContext'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'
import { useLessonVoiceInput } from '@/lib/voice/useLessonVoiceInput'

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
}

function formatExplainBubble(answer: TutorExplainAnswer): string {
  const parts = [...answer.paragraphs]
  if (answer.examplesEn.length > 0) {
    parts.push(answer.examplesEn.map((ex) => `• ${ex}`).join('\n'))
  }
  if (answer.rememberRu) parts.push(answer.rememberRu)
  return parts.join('\n\n')
}

export default function TutorChatPanel({ initialPrefill = '', onDone }: TutorChatPanelProps) {
  const session = useTutorSessionOptional()
  const [draft, setDraft] = useState(initialPrefill)
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [triageChips, setTriageChips] = useState<TutorComposerChip[]>([])
  const [followUpMode, setFollowUpMode] = useState(false)
  const [anchorQuery, setAnchorQuery] = useState<string | null>(null)
  const [postExplainChips, setPostExplainChips] = useState(false)
  const [lastExplain, setLastExplain] = useState<TutorExplainAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const [microPhase, setMicroPhase] = useState<MicroPhase>('idle')
  const [microPack, setMicroPack] = useState<TutorMicroPack | null>(null)
  const [microIndex, setMicroIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const idBase = useId()
  const seqRef = useRef(0)
  const restoredRef = useRef(false)
  const voice = useLessonVoiceInput({ inviteKey: null })

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
    setFollowUpMode(snap.followUpMode)
    setPostExplainChips(snap.postExplainChips)
    setThread(snap.thread.map((m) => ({ id: m.id, role: m.role, text: m.text })))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [thread, triageChips, postExplainChips, busy, microPhase, microIndex])

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
      followUpMode,
      postExplainChips,
      thread: thread.map(({ id, role, text }) => ({ id, role, text })),
      lastExplainCanonicalKey: lastExplain?.topicAnchor.canonicalKey ?? null,
    }
  }, [anchorQuery, draft, followUpMode, lastExplain, postExplainChips, thread])

  const abortMicro = useCallback(() => {
    setMicroPhase('idle')
    setMicroPack(null)
    setMicroIndex(0)
  }, [])

  const resetToNewQuestion = useCallback(() => {
    abortMicro()
    setTriageChips([])
    setFollowUpMode(false)
    setAnchorQuery(null)
    setPostExplainChips(false)
    setLastExplain(null)
    setDraftSynced('')
  }, [abortMicro, setDraftSynced])

  const runExplain = useCallback(
    async (query: string, anchorTitle?: string | null) => {
      abortMicro()
      setBusy(true)
      try {
        const response = await fetch('/api/tutor-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            anchorTitle: anchorTitle || undefined,
            audience: session?.settings.audience ?? 'adult',
            level: session?.settings.level ?? 'a2',
            provider: session?.settings.provider ?? 'openai',
            openAiChatPreset: session?.settings.openAiChatPreset,
          }),
        })
        const data = (await response.json()) as {
          answer?: TutorExplainAnswer
          userMessage?: string
        }
        if (!response.ok || !data.answer) {
          append('assistant', data.userMessage || TUTOR_CHAT_COPY.explainFailed)
          setPostExplainChips(false)
          return
        }
        const answer = data.answer
        setLastExplain(answer)
        setAnchorQuery(answer.topicAnchor.title || query)
        setPostExplainChips(true)
        setTriageChips([])
        setFollowUpMode(false)
        append('assistant', formatExplainBubble(answer), answer)
        recordTutorCuriosity({
          topicTitle: answer.topicAnchor.title || answer.title,
          questionRu: query,
          canonicalKey: answer.topicAnchor.canonicalKey,
        })
      } catch {
        append('assistant', TUTOR_CHAT_COPY.explainFailed)
        setPostExplainChips(false)
      } finally {
        setBusy(false)
      }
    },
    [abortMicro, append, session]
  )

  const analyzeSchoolPhoto = useCallback(
    async (imageDataUrl: string) => {
      if (busy || microPhase === 'active') return
      setBusy(true)
      append('user', TUTOR_CHAT_COPY.photoUserLabel)
      let pendingExplain: string | null = null
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
          append('assistant', data.userMessage || data.error || TUTOR_CHAT_COPY.photoReject)
          return
        }
        const result = data.schoolPhoto
        if (result.kind === 'rejected') {
          append('assistant', result.messageRu)
          return
        }
        if (result.topics.length === 1) {
          pendingExplain = result.topics[0]!
          setAnchorQuery(pendingExplain)
          return
        }
        setAnchorQuery(null)
        setPostExplainChips(false)
        setTriageChips(chipsFromLabels(result.topics))
        append('assistant', TUTOR_CHAT_COPY.photoMultiPick)
      } catch {
        append('assistant', TUTOR_CHAT_COPY.photoReject)
      } finally {
        setBusy(false)
      }
      if (pendingExplain) void runExplain(pendingExplain)
    },
    [append, busy, microPhase, runExplain, session]
  )

  const handlePaperclipClick = useCallback(() => {
    if (busy || microPhase === 'active') return
    fileInputRef.current?.click()
  }, [busy, microPhase])

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

  const handleMicClick = useCallback(() => {
    if (busy || microPhase === 'active') return
    if (voice.listening) {
      voice.stopListening()
      return
    }
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
        append('assistant', `${TUTOR_CHAT_COPY.triagePickGoal} «${result.topicHint}»`)
        return
      }
      if (result.kind === 'C') {
        setAnchorQuery(result.broadTerm)
        setTriageChips(result.chips)
        setPostExplainChips(false)
        append('assistant', `${TUTOR_CHAT_COPY.triagePickAngle} «${result.broadTerm}»`)
        return
      }
      setTriageChips([])
      setPostExplainChips(false)
      append('assistant', result.clarifyPromptRu)
    },
    [append, runExplain]
  )

  const handleSubmit = useCallback(() => {
    const text = draft.trim()
    if (!text || busy || microPhase === 'active' || voice.listening) return

    if (followUpMode && anchorQuery) {
      append('user', text)
      setDraftSynced('')
      setFollowUpMode(false)
      void runExplain(text, anchorQuery)
      return
    }

    append('user', text)
    setDraftSynced('')
    applyTriage(localTutorTriage(text))
  }, [
    anchorQuery,
    append,
    applyTriage,
    busy,
    draft,
    followUpMode,
    microPhase,
    runExplain,
    setDraftSynced,
    voice.listening,
  ])

  const handleChipSelect = useCallback(
    (chipId: string) => {
      const chip = triageChips.find((c) => c.id === chipId)
      if (!chip || busy) return
      const combined = anchorQuery ? `${anchorQuery}: ${chip.labelRu}` : chip.labelRu
      append('user', chip.labelRu)
      setTriageChips([])
      setAnchorQuery(combined)
      void runExplain(combined, anchorQuery)
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
      return
    }
    setMicroPack(pack)
    setMicroIndex(0)
    setMicroPhase('active')
    setPostExplainChips(false)
    setTriageChips([])
    append('assistant', `${TUTOR_CHAT_COPY.microStart}\n\n${pack.items[0]!.promptRu}`)
  }, [append, lastExplain])

  const finishMicro = useCallback(
    (pack: TutorMicroPack) => {
      setMicroPhase('finale')
      setMicroPack(pack)
      append('assistant', pack.summaryRu)
      setPostExplainChips(false)
    },
    [append]
  )

  const answerMicro = useCallback(
    (optionIndex: number) => {
      if (microPhase !== 'active' || !microPack || !lastExplain) return
      const item: TutorMicroItem | undefined = microPack.items[microIndex]
      if (!item) return
      const chosen = item.options[optionIndex] ?? ''
      append('user', chosen)
      const correct = optionIndex === item.correctIndex
      if (correct) {
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
        finishMicro(microPack)
        return
      }
      setMicroIndex(next)
      append('assistant', microPack.items[next]!.promptRu)
    },
    [append, finishMicro, lastExplain, microIndex, microPack, microPhase]
  )

  const cheatsheetChipVisible =
    lastExplain != null &&
    lastExplain.cheatsheetVisibility !== 'hidden' &&
    (session?.referenceEnabled ?? true)

  const finaleChips: TutorComposerChip[] = [
    { id: 'again', labelRu: TUTOR_CHAT_COPY.chipAgain },
    { id: 'other', labelRu: TUTOR_CHAT_COPY.chipOtherQuestion },
    { id: 'done', labelRu: TUTOR_CHAT_COPY.chipDone },
    ...(cheatsheetChipVisible
      ? [{ id: 'cheatsheet', labelRu: TUTOR_CHAT_COPY.chipCheatsheet } satisfies TutorComposerChip]
      : []),
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
              { id: 'clarify', labelRu: TUTOR_CHAT_COPY.chipClarify },
              { id: 'micro', labelRu: TUTOR_CHAT_COPY.chipMicro },
              ...(cheatsheetChipVisible
                ? [{ id: 'cheatsheet', labelRu: TUTOR_CHAT_COPY.chipCheatsheet } satisfies TutorComposerChip]
                : []),
              { id: 'other', labelRu: TUTOR_CHAT_COPY.chipOtherQuestion },
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
        if (chipId === 'other') {
          resetToNewQuestion()
          return
        }
        if (chipId === 'done') {
          abortMicro()
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
      if (chipId === 'clarify') {
        setFollowUpMode(true)
        setPostExplainChips(false)
        setTriageChips([])
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
        return
      }
      if (chipId === 'other') {
        resetToNewQuestion()
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
      resetToNewQuestion,
      session,
      startMicro,
    ]
  )

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
      style={{ boxShadow: 'var(--chat-shell-shadow)' }}
      data-testid="tutor-chat-panel"
    >
      <DialogGlassScrollHost>
        <div
          ref={scrollRef}
          className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3`}
        >
          {thread.length === 0 && !busy ? (
            <p className="px-1 py-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
              {TUTOR_CHAT_COPY.emptyThreadHint}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {thread.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[14px] leading-snug ${
                    msg.role === 'user'
                      ? 'ml-auto bg-[var(--chat-user-bubble-bg,var(--accent))] text-[var(--chat-user-bubble-text,var(--accent-text,#fff))]'
                      : 'mr-auto border border-[var(--border)] bg-[var(--menu-card-bg)] text-[var(--text)]'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {busy ? (
                <div className="mr-auto max-w-[92%] rounded-2xl border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[14px] text-[var(--text-muted)]">
                  {TUTOR_CHAT_COPY.loadingExplain}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogGlassScrollHost>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.target.value = ''
          handlePhotoFile(file)
        }}
      />
      <DialogComposerStack
        className={CHAT_COMPOSER_STACK_TOP_CLASS}
        style={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
        contentMaxWidthClass="max-w-none"
      >
        <TutorComposer
          value={voice.isVoiceActive || voice.listening ? voice.displayText : draft}
          onChange={setDraftSynced}
          onSubmit={handleSubmit}
          chips={primaryChips}
          onChipSelect={handlePrimaryChip}
          followUpMode={followUpMode}
          disabled={busy || microPhase === 'active'}
          readOnly={voice.isInputLocked}
          micDisabled={false}
          listening={voice.listening}
          micVisualState={voice.micVisualState}
          onMicClick={handleMicClick}
          paperclipDisabled={false}
          onPaperclipClick={handlePaperclipClick}
          voiceStatusMessage={voice.voiceStatusMessage}
        />
      </DialogComposerStack>
    </div>
  )
}
