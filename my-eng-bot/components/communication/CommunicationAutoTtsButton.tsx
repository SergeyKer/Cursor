'use client'

import { COMMUNICATION_TTS_COPY } from '@/lib/uiCopy/communicationTts'
import { unlockTtsAudioContext } from '@/lib/tts/streamTtsPlayback'

type CommunicationAutoTtsButtonProps = {
  enabled: boolean
  onToggle: () => void
}

function SpeakerOnIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  )
}

function SpeakerOffIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 9l5 6m0-6l-5 6"
      />
    </svg>
  )
}

export function CommunicationAutoTtsButton({ enabled, onToggle }: CommunicationAutoTtsButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        unlockTtsAudioContext()
        onToggle()
      }}
      className="app-header-control chat-action-button pointer-events-auto relative z-20 flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation"
      style={{ borderRadius: 'var(--app-header-control-radius)' }}
      aria-pressed={enabled}
      aria-label={enabled ? COMMUNICATION_TTS_COPY.autoOnAria : COMMUNICATION_TTS_COPY.autoOffAria}
      title={enabled ? COMMUNICATION_TTS_COPY.autoOnTitle : COMMUNICATION_TTS_COPY.autoOffTitle}
    >
      {enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
    </button>
  )
}
