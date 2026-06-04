import React from 'react'
import { getChatComposerOverlayVerticalClass } from '@/lib/chatComposerMetrics'

type VoiceComposerOverlayProps = {
  draftBeforeVoiceText: string
  livePreviewText: string
  /** Согласовать padding/line-height с textarea на iOS и Chrome (см. needsVoiceComposerWebMetrics). */
  webTextMetricsFix?: boolean
}

function renderSegment(text: string, className?: string) {
  if (!text) return null
  return <span className={className}>{text}</span>
}

export default function VoiceComposerOverlay({
  draftBeforeVoiceText,
  livePreviewText,
  webTextMetricsFix = false,
}: VoiceComposerOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl px-4 font-sans text-base text-[var(--text)] ${
        webTextMetricsFix
          ? getChatComposerOverlayVerticalClass(true)
          : `${getChatComposerOverlayVerticalClass(false)} leading-[1.45rem]`
      }`}
    >
      {renderSegment(draftBeforeVoiceText)}
      {draftBeforeVoiceText && livePreviewText ? ' ' : null}
      {renderSegment(livePreviewText, 'font-sans italic text-[var(--text-muted)]')}
    </div>
  )
}
