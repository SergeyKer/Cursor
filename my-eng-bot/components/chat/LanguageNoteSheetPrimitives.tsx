'use client'

import type { ReactNode } from 'react'
import { highlightCorrected } from '@/lib/languageNote/highlightCorrected'
import { manropeHome } from '@/lib/manropeHome'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

export type LanguageNoteSectionTone = 'neutral' | 'amber' | 'emerald' | 'praise' | 'slate'

function toneClasses(tone: LanguageNoteSectionTone): { surface: string; label: string } {
  if (tone === 'amber') {
    return {
      surface:
        'border-[var(--chat-section-amber-border)] bg-[var(--chat-section-amber)]',
      label: 'text-[var(--status-warning-text)]',
    }
  }
  if (tone === 'emerald' || tone === 'praise' || tone === 'slate') {
    return {
      surface: 'language-note-card--shared',
      label: 'text-[var(--language-note-card-label)]',
    }
  }
  return {
    surface:
      'border-[var(--chat-section-neutral-border)] bg-[var(--chat-section-neutral)]',
    label: 'text-[var(--chat-label-neutral)]',
  }
}

const NOTE_LABEL_CLASS = `${manropeHome.className} text-[15px] font-bold uppercase tracking-[0.06em]`

const TOPIC_CHIP_BASE_CLASS =
  'language-note-topic-chip inline-flex w-fit max-w-full min-h-10 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-left font-sans text-[13px] font-normal leading-snug text-[var(--text)] touch-manipulation transition-[background-color,border-color,transform,opacity] duration-150'

export const LANGUAGE_NOTE_CONTENT_INDENT_CLASS = 'language-note-content'

export function LanguageNoteTopicChip({
  children,
  onClick,
  disabled,
  interactive,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  interactive?: boolean
}) {
  if (!interactive || !onClick) {
    return <div className={`${TOPIC_CHIP_BASE_CLASS}`}>{children}</div>
  }
  return (
    <button
      type="button"
      className={`${TOPIC_CHIP_BASE_CLASS} language-note-topic-chip--button cursor-pointer hover:brightness-[0.98] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:cursor-default disabled:opacity-55 disabled:active:scale-100`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
        ›
      </span>
    </button>
  )
}

export function LanguageNoteSectionCard({
  tone,
  marker,
  title,
  children,
}: {
  tone: LanguageNoteSectionTone
  marker: string
  title: string
  children: ReactNode
}) {
  const { surface, label } = toneClasses(tone)
  return (
    <section
      className={`chat-section-surface language-note-card relative block min-w-0 w-full max-w-full overflow-hidden rounded-xl border font-sans ${surface}`}
      role="note"
    >
      <p className={`${NOTE_LABEL_CLASS} ${label}`}>
        <span aria-hidden>{marker}</span> {title}
      </p>
      <div className="language-note-card__body min-w-0 font-sans text-[15px] leading-[1.45] text-[var(--text)]">
        {children}
      </div>
    </section>
  )
}

export function LanguageNoteHighlightedPhrase({
  text,
  highlights,
}: {
  text: string
  highlights: string[]
}) {
  const segments = highlightCorrected(text, highlights)
  return (
    <p
      className={`min-w-0 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} whitespace-pre-wrap break-words font-sans text-[15px] font-normal leading-[1.45] text-[var(--text)]`}
    >
      {segments.map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="font-bold">
            {seg.text}
          </strong>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  )
}

export function LanguageNoteReasonsList({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null
  return (
    <div className="language-note-reasons">
      <ul className="language-note-reasons__list font-sans text-[14px] font-normal leading-snug">
        {reasons.map((reason, i) => (
          <li key={`${i}-${reason.slice(0, 24)}`} className="min-w-0 break-words">
            {reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LanguageNoteOriginalMessageCard({ text }: { text: string }) {
  const trimmed = text.trim()
  if (!trimmed) return null
  return (
    <LanguageNoteSectionCard tone="emerald" marker="💬" title={LANGUAGE_NOTE_COPY.original}>
      <p
        className={`min-w-0 ${LANGUAGE_NOTE_CONTENT_INDENT_CLASS} whitespace-pre-wrap break-words font-sans text-[15px] font-normal leading-[1.45] text-[var(--text)]`}
      >
        {trimmed}
      </p>
    </LanguageNoteSectionCard>
  )
}

export function phrasesEqualLoose(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  return norm(a) === norm(b)
}
