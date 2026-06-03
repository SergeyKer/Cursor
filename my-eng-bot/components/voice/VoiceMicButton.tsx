'use client'

import type { MicVisualState } from '@/lib/voice/useMicInviteAnimation'

type VoiceMicButtonProps = {
  listening: boolean
  disabled?: boolean
  micVisualState: MicVisualState
  onClick: () => void
  title?: string
  ariaLabel?: string
  className?: string
}

export function MicIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

export default function VoiceMicButton({
  listening,
  disabled = false,
  micVisualState,
  onClick,
  title = 'Голосовой ввод',
  ariaLabel = 'Голосовой ввод',
  className = '',
}: VoiceMicButtonProps) {
  const micActionActive = listening

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`chat-action-button chat-control-surface relative isolate flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full p-2.5 touch-manipulation ${
        micActionActive ? 'text-[var(--chat-control-active-text)]' : 'text-[var(--chat-control-text)]'
      } ${micVisualState === 'invite' ? 'animate-invite' : ''} ${className}`}
      style={{
        background: micActionActive ? 'var(--chat-control-active-bg)' : 'var(--chat-control-bg)',
        boxShadow: micActionActive ? 'var(--chat-control-shadow)' : undefined,
      }}
      title={title}
      aria-label={ariaLabel}
      onMouseEnter={(event) => {
        if (!micActionActive && micVisualState !== 'wait') {
          event.currentTarget.style.background = 'var(--chat-control-hover)'
        }
      }}
      onMouseLeave={(event) => {
        if (!micActionActive && micVisualState !== 'wait') {
          event.currentTarget.style.background = 'var(--chat-control-bg)'
        }
      }}
    >
      {micVisualState === 'wait' && (
        <span
          aria-hidden="true"
          className="animate-wait pointer-events-none absolute inset-0 rounded-full"
          style={{
            opacity: 0.82,
            backgroundImage:
              'linear-gradient(250deg, transparent 12%, rgba(255, 255, 255, 0.1) 38%, rgba(255, 255, 255, 0.42) 52%, rgba(255, 255, 255, 0.14) 72%, transparent 90%)',
            animationDuration: '9s',
          }}
        />
      )}
      {micActionActive ? (
        <span className="relative z-10 h-5 w-5 rounded-full bg-[var(--chat-control-dot)] animate-pulse" />
      ) : (
        <span className="relative z-10">
          <MicIcon />
        </span>
      )}
    </button>
  )
}

export function TextEditIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}
