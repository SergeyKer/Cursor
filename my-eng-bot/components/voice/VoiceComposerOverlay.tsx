import React from 'react'

type VoiceComposerOverlayProps = {
  draftBeforeVoiceText: string
  finalText: string
  interimText: string
}

function renderSegment(text: string, className?: string) {
  if (!text) return null
  return <span className={className}>{text}</span>
}

export default function VoiceComposerOverlay({
  draftBeforeVoiceText,
  finalText,
  interimText,
}: VoiceComposerOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-base leading-[1.45rem]"
    >
      {renderSegment(draftBeforeVoiceText)}
      {draftBeforeVoiceText && (finalText || interimText) ? ' ' : null}
      {renderSegment(finalText)}
      {finalText && interimText ? ' ' : null}
      {renderSegment(interimText, 'italic text-[var(--text-muted)] opacity-80')}
    </div>
  )
}
