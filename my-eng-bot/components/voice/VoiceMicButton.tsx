'use client'

import type { MicVisualState } from '@/lib/voice/useMicInviteAnimation'

type VoiceMicButtonProps = {
  listening: boolean
  /** STT finalizing — ring spinner; takes priority over listening for icon. */
  finalizing?: boolean
  disabled?: boolean
  micVisualState: MicVisualState
  onClick: () => void
  title?: string
  ariaLabel?: string
  className?: string
}

/** Circumference of r=18 ≈ 113.1; arc ≈ 33% of ring. */
const MIC_FINALIZE_CIRCUMFERENCE = 2 * Math.PI * 18
const MIC_FINALIZE_ARC = MIC_FINALIZE_CIRCUMFERENCE * 0.33

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

function MicFinalizeRing() {
  return (
    <svg
      aria-hidden="true"
      className="animate-mic-finalize pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 44 44"
      fill="none"
    >
      <circle
        cx="22"
        cy="22"
        r="18"
        stroke="color-mix(in srgb, var(--chat-control-text) 22%, transparent)"
        strokeWidth="2"
      />
      <circle
        cx="22"
        cy="22"
        r="18"
        stroke="color-mix(in srgb, var(--chat-control-text) 78%, transparent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${MIC_FINALIZE_ARC} ${MIC_FINALIZE_CIRCUMFERENCE - MIC_FINALIZE_ARC}`}
        transform="rotate(-90 22 22)"
      />
    </svg>
  )
}

export default function VoiceMicButton({
  listening,
  finalizing = false,
  disabled = false,
  micVisualState,
  onClick,
  title = 'Голосовой ввод',
  ariaLabel = 'Голосовой ввод',
  className = '',
}: VoiceMicButtonProps) {
  const recordingActive = listening && !finalizing
  const suppressInviteChrome = recordingActive || finalizing

  return (
    <span className="chat-control-bead inline-flex shrink-0 rounded-full">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-busy={finalizing || undefined}
        className={`chat-action-button chat-control-surface relative isolate flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full p-2.5 touch-manipulation ${
          recordingActive ? 'text-[var(--chat-control-active-text)]' : 'text-[var(--chat-control-text)]'
        } ${!suppressInviteChrome && micVisualState === 'invite' ? 'animate-invite' : ''} ${className}`}
        style={{
          background: recordingActive ? 'var(--chat-control-active-bg)' : 'var(--chat-control-bg)',
        }}
        title={title}
        aria-label={ariaLabel}
        onMouseEnter={(event) => {
          if (suppressInviteChrome || micVisualState === 'wait') return
          event.currentTarget.style.background = 'var(--chat-control-hover)'
        }}
        onMouseLeave={(event) => {
          if (suppressInviteChrome || micVisualState === 'wait') return
          event.currentTarget.style.background = 'var(--chat-control-bg)'
        }}
      >
        {!suppressInviteChrome && micVisualState === 'wait' ? (
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
        ) : null}
        {finalizing ? (
          <MicFinalizeRing />
        ) : recordingActive ? (
          <span className="relative z-10 h-5 w-5 rounded-full bg-[var(--chat-control-dot)] animate-pulse" />
        ) : (
          <span className="relative z-10">
            <MicIcon />
          </span>
        )}
      </button>
    </span>
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
