'use client'

import type { VocabularyTempo } from '@/types/vocabulary'

type Props = {
  value: VocabularyTempo
  onChange: (tempo: VocabularyTempo) => void
}

const OPTIONS: { id: VocabularyTempo; label: string }[] = [
  { id: 'sprint', label: 'Sprint · 3' },
  { id: 'full', label: 'Full · 5' },
]

export default function VocabularyTempoToggle({ value, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 rounded-[1rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] p-1 shadow-sm">
        {OPTIONS.map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ${
                active ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="px-1 text-[12px] leading-snug text-[var(--text-muted)]">
        {value === 'sprint'
          ? 'Быстрый заход · ~10 шагов'
          : 'Разобрать глубже · ~25 шагов'}
      </p>
    </div>
  )
}
