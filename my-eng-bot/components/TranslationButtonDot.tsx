'use client'

/** Фиксированные цвета точки «Перевод» - не зависят от темы (basic / futuristic / bubble). */
export const TRANSLATION_BUTTON_DOT_BG = {
  ready: 'bg-[#22c55e]',
  loading: 'bg-[#ea580c]',
  error: 'bg-[#ef4444]',
  idle: 'bg-[#94a3b8]',
} as const

export type TranslationDotState = keyof typeof TRANSLATION_BUTTON_DOT_BG

export function translationDotClassName(state: TranslationDotState): string {
  return TRANSLATION_BUTTON_DOT_BG[state]
}

type TranslationButtonDotProps = {
  state: TranslationDotState
}

export function TranslationButtonDot({ state }: TranslationButtonDotProps) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${translationDotClassName(state)}`}
      aria-hidden
    />
  )
}

/** @deprecated Используйте TranslationDotState */
export type EngvoCallTranslationDotState = TranslationDotState
