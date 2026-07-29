'use client'

import { useRef, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
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
  /** Only busy — micro/nav chips stay clickable when composer is locked for input. */
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
  /** Micro option chips use lesson-choice-chip look; triage/nav stay pills. */
  chipsMode?: 'micro' | 'nav'
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

  return (
    <div className="flex w-full flex-col gap-1.5">
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-0.5" role="group" aria-label="Варианты">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={chipsDisabled}
              onClick={() => onChipSelect?.(chip.id)}
              className={
                chipsMode === 'micro'
                  ? `lesson-choice-chip lesson-choice-chip-enter touch-manipulation rounded-xl border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-3 py-2 text-[15px] font-medium text-[var(--text)] disabled:opacity-50`
                  : `tutor-composer-nav-chip touch-manipulation rounded-full border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)] lesson-enter disabled:opacity-50`
              }
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
              <div
                aria-hidden="true"
                className={`ios-chrome-voice-status-overlay pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl px-4 font-sans text-[14px] italic leading-snug ${
                  voiceWebMetricsActive
                    ? getChatComposerOverlayVerticalClass(true)
                    : getChatComposerOverlayVerticalClass(false)
                }`}
                style={{
                  color: voiceStatusIsDanger
                    ? 'var(--status-danger-text, #dc2626)'
                    : 'var(--text-muted)',
                }}
              >
                {iosChromeVoiceStatusMessage}
              </div>
            </>
          ) : null}
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={composerLocked}
            readOnly={readOnly || listening || isVoiceActive}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Поле ввода вопроса репетитору"
            className={`chat-input-field communication-chat-input-field min-w-0 w-full resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 pr-12 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(voiceWebMetricsActive)} ${
              showVoiceOverlay
                ? 'text-transparent caret-transparent placeholder:text-transparent'
                : 'text-[var(--text)] placeholder:text-[var(--text-muted)]'
            }`}
            style={{ maxHeight: INPUT_MAX_HEIGHT_PX }}
          />
          <div className="pointer-events-none absolute inset-y-0 right-2 z-10 flex items-center">
            <button
              type="button"
              disabled={paperclipDisabled || composerLocked}
              onClick={() => {
                if (paperclipDisabled || composerLocked) return
                onPaperclipClick?.()
              }}
              className={`${TUTOR_PAPERCLIP_BUTTON_CLASS} chat-action-button pointer-events-auto inline-flex h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] text-[var(--chat-speaker-text)]`}
              title="Прикрепить фото"
              aria-label="Прикрепить фото"
            >
              <PaperclipIcon />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSend}
          className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)]"
          style={{ background: 'var(--chat-send-bg)' }}
          aria-label={TUTOR_CHAT_COPY.send}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none">
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
      {voiceStatusMessage ? (
        <p
          className={`px-1 pt-1.5 text-xs ${
            voiceStatusIsDanger ? 'text-[var(--status-danger-text,#dc2626)]' : 'text-[var(--text-muted)]'
          }`}
          role="status"
        >
          {voiceStatusMessage}
        </p>
      ) : null}
    </div>
  )
}
