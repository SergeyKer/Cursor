'use client'

import { useRef, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import {
  CHAT_COMPOSER_FORM_CLASS,
  CHAT_COMPOSER_MENU_DOCK_FORM_CLASS,
  CHAT_COMPOSER_TYPO_CLASS,
  getChatComposerOverlayVerticalClass,
  getChatComposerTextareaVerticalClass,
} from '@/lib/chatComposerMetrics'
import { TUTOR_PAPERCLIP_BUTTON_CLASS } from '@/lib/tutor/composerContracts'
import type { TutorComposerChip } from '@/lib/tutor/types'
import { TUTOR_CHAT_COPY, tutorComposerPlaceholder } from '@/lib/uiCopy/tutorChat'
import { useAutoGrowTextarea } from '@/lib/voice/useAutoGrowTextarea'
import VoiceComposerOverlay from '@/components/voice/VoiceComposerOverlay'
import VoiceMicButton from '@/components/voice/VoiceMicButton'
import type { MicVisualState } from '@/lib/voice/useMicInviteAnimation'

const INPUT_MAX_HEIGHT_PX = 260

const SR_ONLY_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

function PaperclipIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
      />
    </svg>
  )
}

export type TutorComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  /** Locks textarea / mic / paperclip / send (busy or micro active). */
  composerLocked?: boolean
  /** Busy or micro revealing — idle/finale nav, triage, and active options stay clickable. */
  chipsDisabled?: boolean
  readOnly?: boolean
  micDisabled?: boolean
  listening?: boolean
  finalizing?: boolean
  isVoiceActive?: boolean
  micVisualState?: MicVisualState
  onMicClick?: () => void
  paperclipDisabled?: boolean
  onPaperclipClick?: () => void
  chips?: TutorComposerChip[]
  onChipSelect?: (chipId: string) => void
  /** Micro = larger choice chips; nav = compact pills. Both use practice idle colors + enter. */
  chipsMode?: 'micro' | 'nav'
  /** Remount micro chip row so enter animation replays between questions. */
  chipsResetKey?: string
  /** Practice-style freeze while holding answered micro options. */
  microChoiceFrozen?: boolean
  /** Amber wrong highlight text (practice parity). */
  wrongChoiceText?: string | null
  voiceStatusMessage?: string | null
  voiceStatusIsDanger?: boolean
  showVoiceOverlay?: boolean
  draftBeforeVoiceText?: string
  livePreviewText?: string
  voiceWebMetricsClient?: boolean
  iosChromeVoiceStatusMessage?: string | null
  /** Menu tutor: menu-card elevation (border + soft shadow), no chat glass. */
  menuDock?: boolean
}

export default function TutorComposer({
  value,
  onChange,
  onSubmit,
  placeholder = tutorComposerPlaceholder('adult'),
  composerLocked = false,
  chipsDisabled = false,
  readOnly = false,
  micDisabled = true,
  listening = false,
  finalizing = false,
  isVoiceActive = false,
  micVisualState = 'idle',
  onMicClick,
  paperclipDisabled = true,
  onPaperclipClick,
  chips = [],
  onChipSelect,
  chipsMode = 'nav',
  chipsResetKey,
  microChoiceFrozen = false,
  wrongChoiceText = null,
  voiceStatusMessage = null,
  voiceStatusIsDanger = false,
  showVoiceOverlay = false,
  draftBeforeVoiceText = '',
  livePreviewText = '',
  voiceWebMetricsClient = false,
  iosChromeVoiceStatusMessage = null,
  menuDock = false,
}: TutorComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const voiceWebMetricsActive = showVoiceOverlay && voiceWebMetricsClient
  const isMicroChoicePanel = chipsMode === 'micro'
  const canSend =
    value.trim().length > 0 && !composerLocked && !listening && !finalizing && !isVoiceActive

  useAutoGrowTextarea({
    textareaRef,
    value,
    maxHeightPx: INPUT_MAX_HEIGHT_PX,
    minHeightPx: 44,
    isVoiceActive,
    showVoiceOverlay,
    voiceWebMetricsActive,
  })

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  if (isMicroChoicePanel) {
    const resetKey = chipsResetKey ?? 'micro'
    return (
      <div className="flex w-full flex-col" aria-busy={chips.length === 0}>
        <LessonChoiceChips
          choices={chips.map((chip) => chip.labelRu)}
          onChoose={(text) => {
            const chip = chips.find((entry) => entry.labelRu === text)
            if (!chip) return
            onChipSelect?.(chip.id)
          }}
          disabled={chipsDisabled}
          frozen={microChoiceFrozen}
          wrongChoiceText={wrongChoiceText}
          resetKey={resetKey}
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-0.5" role="group" aria-label="Варианты">
          {chips.map((chip, index) => (
            <button
              key={chip.id}
              type="button"
              disabled={chipsDisabled}
              onClick={() => onChipSelect?.(chip.id)}
              style={{ animationDelay: `${index * 85}ms` }}
              className="tutor-composer-nav-chip lesson-choice-chip-enter touch-manipulation rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-700 [@media(hover:hover)]:hover:bg-blue-100 disabled:opacity-50"
            >
              {chip.labelRu}
            </button>
          ))}
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={menuDock ? CHAT_COMPOSER_MENU_DOCK_FORM_CLASS : CHAT_COMPOSER_FORM_CLASS}
        style={menuDock ? undefined : { boxShadow: 'var(--chat-composer-shadow)' }}
        aria-label="Вопрос репетитору"
      >
        <VoiceMicButton
          listening={listening}
          finalizing={finalizing}
          disabled={micDisabled || composerLocked || finalizing}
          micVisualState={micVisualState}
          onClick={() => {
            if (micDisabled || composerLocked || finalizing) return
            onMicClick?.()
          }}
          title={listening ? 'Остановить' : finalizing ? 'Распознаю речь' : 'Голосовой ввод'}
          ariaLabel={
            listening ? 'Остановить запись' : finalizing ? 'Распознаю речь' : 'Голосовой ввод'
          }
        />

        <div className="relative isolate min-w-0 flex-1">
          {showVoiceOverlay ? (
            <VoiceComposerOverlay
              draftBeforeVoiceText={draftBeforeVoiceText}
              livePreviewText={livePreviewText}
              webTextMetricsFix={voiceWebMetricsClient}
            />
          ) : null}
          {iosChromeVoiceStatusMessage ? (
            <>
              <span role="status" aria-live="polite" style={SR_ONLY_STYLE}>
                {iosChromeVoiceStatusMessage}
              </span>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 z-[2] flex items-center px-0.5 text-[15px] leading-snug ${
                  voiceStatusIsDanger ? 'text-red-600' : 'text-[var(--muted)]'
                } ${getChatComposerOverlayVerticalClass(Boolean(menuDock))}`}
              >
                {iosChromeVoiceStatusMessage}
              </span>
            </>
          ) : null}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            readOnly={readOnly || composerLocked}
            aria-label="Текст вопроса"
            className={`relative z-[1] block w-full resize-none border-0 bg-transparent px-0.5 ${CHAT_COMPOSER_TYPO_CLASS} text-[var(--text)] outline-none placeholder:text-[var(--muted)] ${getChatComposerTextareaVerticalClass(Boolean(menuDock))} ${
              showVoiceOverlay || iosChromeVoiceStatusMessage ? 'caret-transparent text-transparent' : ''
            }`}
          />
        </div>

        <button
          type="button"
          disabled={paperclipDisabled || composerLocked}
          onClick={() => {
            if (paperclipDisabled || composerLocked) return
            onPaperclipClick?.()
          }}
          className={TUTOR_PAPERCLIP_BUTTON_CLASS}
          title="Прикрепить"
          aria-label="Прикрепить"
        >
          <PaperclipIcon />
        </button>

        <button
          type="submit"
          disabled={!canSend}
          className="chat-input-inline-send-button"
          title={TUTOR_CHAT_COPY.send}
          aria-label={TUTOR_CHAT_COPY.send}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>

      {voiceStatusMessage ? (
        <p
          className={`px-0.5 text-[12px] leading-snug ${
            voiceStatusIsDanger ? 'text-red-600' : 'text-[var(--muted)]'
          }`}
          role="status"
          aria-live="polite"
        >
          {voiceStatusMessage}
        </p>
      ) : null}
    </div>
  )
}
