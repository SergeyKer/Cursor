'use client'

import { useRef, type FormEvent, type KeyboardEvent } from 'react'
import {
  CHAT_COMPOSER_FORM_CLASS,
  CHAT_COMPOSER_TYPO_CLASS,
  getChatComposerTextareaVerticalClass,
} from '@/lib/chatComposerMetrics'
import { TUTOR_PAPERCLIP_BUTTON_CLASS } from '@/lib/tutor/composerContracts'
import type { TutorComposerChip } from '@/lib/tutor/types'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'
import VoiceMicButton from '@/components/voice/VoiceMicButton'
import type { MicVisualState } from '@/lib/voice/useMicInviteAnimation'

const INPUT_MAX_HEIGHT_PX = 120

function PaperclipIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
  disabled?: boolean
  readOnly?: boolean
  micDisabled?: boolean
  listening?: boolean
  micVisualState?: MicVisualState
  onMicClick?: () => void
  paperclipDisabled?: boolean
  onPaperclipClick?: () => void
  chips?: TutorComposerChip[]
  onChipSelect?: (chipId: string) => void
  followUpMode?: boolean
  voiceStatusMessage?: string | null
}

export default function TutorComposer({
  value,
  onChange,
  onSubmit,
  placeholder = TUTOR_CHAT_COPY.composerPlaceholder,
  disabled = false,
  readOnly = false,
  micDisabled = true,
  listening = false,
  micVisualState = 'idle',
  onMicClick,
  paperclipDisabled = true,
  onPaperclipClick,
  chips = [],
  onChipSelect,
  followUpMode = false,
  voiceStatusMessage = null,
}: TutorComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const canSend = value.trim().length > 0 && !disabled && !listening

  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT_PX)}px`
  }

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
              disabled={disabled}
              onClick={() => onChipSelect?.(chip.id)}
              className="rounded-full border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)] disabled:opacity-50"
            >
              {chip.labelRu}
            </button>
          ))}
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={CHAT_COMPOSER_FORM_CLASS}
        aria-label={followUpMode ? 'Уточнение к теме' : 'Вопрос репетитору'}
      >
        <VoiceMicButton
          listening={listening}
          disabled={micDisabled || disabled}
          micVisualState={micVisualState}
          onClick={() => {
            if (micDisabled || disabled) return
            onMicClick?.()
          }}
          title={listening ? 'Остановить' : 'Голосовой ввод'}
          ariaLabel={listening ? 'Остановить запись' : 'Голосовой ввод'}
        />

        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            readOnly={readOnly || listening}
            onChange={(event) => {
              onChange(event.target.value)
              resize()
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            className={`chat-input-field min-w-0 w-full resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 text-[var(--text)] placeholder:text-[var(--text-muted)] ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(false)}`}
            style={{ maxHeight: INPUT_MAX_HEIGHT_PX }}
          />
        </div>

        <button
          type="button"
          disabled={paperclipDisabled || disabled}
          onClick={() => {
            if (paperclipDisabled || disabled) return
            onPaperclipClick?.()
          }}
          className={`${TUTOR_PAPERCLIP_BUTTON_CLASS} chat-action-button chat-control-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full p-2.5 text-[var(--chat-control-text)] disabled:opacity-45`}
          style={{ background: 'var(--chat-control-bg)' }}
          title="Прикрепить фото"
          aria-label="Прикрепить фото"
        >
          <PaperclipIcon />
        </button>

        <button
          type="submit"
          disabled={!canSend}
          className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)] disabled:opacity-45"
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
        <p className="px-1 text-[12px] text-[var(--text-muted)]" role="status">
          {voiceStatusMessage}
        </p>
      ) : null}
    </div>
  )
}
