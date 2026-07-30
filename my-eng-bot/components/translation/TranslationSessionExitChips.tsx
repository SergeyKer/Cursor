'use client'

import type { TranslationSessionExitChip } from '@/lib/translation/resolveTranslationSessionExitChips'
import { TRANSLATION_SESSION_EXIT_COPY } from '@/lib/uiCopy/translationSessionExit'

type TranslationSessionExitChipsProps = {
  chips: TranslationSessionExitChip[]
  onSelect?: (id: TranslationSessionExitChip['id']) => void
  disabled?: boolean
}

const NAV_CHIP_CLASS =
  'tutor-composer-nav-chip touch-manipulation rounded-full border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)] lesson-enter disabled:opacity-50'

export default function TranslationSessionExitChips({
  chips,
  onSelect,
  disabled = false,
}: TranslationSessionExitChipsProps) {
  if (chips.length === 0) return null

  return (
    <div
      className="flex flex-wrap gap-1.5 px-0.5"
      role="group"
      aria-label={TRANSLATION_SESSION_EXIT_COPY.chipsAriaLabel}
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect?.(chip.id)}
          className={NAV_CHIP_CLASS}
        >
          {chip.labelRu}
        </button>
      ))}
    </div>
  )
}
