'use client'

import { LanguageNoteSectionCard } from '@/components/chat/LanguageNoteSheetPrimitives'
import type { LessonFooterSheetView } from '@/lib/lessonFooterSheet/types'

export function LessonFooterSheetBody({ view }: { view: LessonFooterSheetView }) {
  return (
    <div className="flex flex-col gap-3">
      <LanguageNoteSectionCard tone="emerald" marker={view.now.marker} title={view.now.title}>
        <p className="language-note-content whitespace-pre-wrap break-words">{view.now.body}</p>
      </LanguageNoteSectionCard>
      <LanguageNoteSectionCard
        tone="neutral"
        marker={view.status.marker}
        title={view.status.title}
      >
        <p className="language-note-content whitespace-pre-wrap break-words">{view.status.body}</p>
      </LanguageNoteSectionCard>
    </div>
  )
}
