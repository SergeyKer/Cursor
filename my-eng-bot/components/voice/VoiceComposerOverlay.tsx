import React from 'react'
import { getChatComposerOverlayVerticalClass } from '@/lib/chatComposerMetrics'

export const VOICE_COMPOSER_LISTENING_STATUS = 'Голосовой ввод...'

type VoiceComposerOverlayProps = {
  statusText?: string | null
  /** Согласовать padding/line-height с textarea на iOS и Chrome (см. needsVoiceComposerWebMetrics). */
  webTextMetricsFix?: boolean
}

export default function VoiceComposerOverlay({
  statusText = VOICE_COMPOSER_LISTENING_STATUS,
  webTextMetricsFix = false,
}: VoiceComposerOverlayProps) {
  if (!statusText) return null
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-nowrap rounded-2xl px-4 font-sans text-base text-[var(--text-muted)] ${
        webTextMetricsFix
          ? getChatComposerOverlayVerticalClass(true)
          : `${getChatComposerOverlayVerticalClass(false)} leading-[1.45rem]`
      }`}
    >
      <span className="block min-w-0 truncate">{statusText}</span>
    </div>
  )
}
