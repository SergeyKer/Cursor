'use client'

import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const THEMES: Array<{ id: 'basic' | 'futuristic'; name: string; description: string }> = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Минимализм, фокус на тексте и спокойные цвета.',
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Градиенты, glass-эффект и выразительный акцент.',
  },
]

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-3 px-1 py-1">
      {THEMES.map((themeOption) => {
        const selected = theme === themeOption.id
        return (
          <button
            key={themeOption.id}
            type="button"
            onClick={() => setTheme(themeOption.id)}
            className={`w-full min-h-[52px] rounded-xl border px-3 py-3 text-left transition-transform ${
              selected
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--accent-color)]/50'
            }`}
            style={themeOption.id === 'futuristic' && selected ? { boxShadow: 'var(--shadow-glow)' } : undefined}
            aria-pressed={selected}
          >
            <p className="text-[15px] font-semibold text-[var(--text-primary)]">{themeOption.name}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-secondary)]">{themeOption.description}</p>
          </button>
        )
      })}
    </div>
  )
}
