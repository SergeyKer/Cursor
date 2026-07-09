'use client'

import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

export type LanguageNoteInfoMarkProps = {
  onPress: () => void
}

export function LanguageNoteInfoMark({ onPress }: LanguageNoteInfoMarkProps) {
  return (
    <button
      type="button"
      className="language-note-info-mark touch-manipulation focus-visible:outline-none"
      aria-label={LANGUAGE_NOTE_COPY.markAria}
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        onPress()
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="language-note-info-mark__glyph" aria-hidden>
        ?
      </span>
    </button>
  )
}
