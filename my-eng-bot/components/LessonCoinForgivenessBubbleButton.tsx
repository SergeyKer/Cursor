'use client'

import type { LessonCoinForgivenessCopy } from '@/lib/lessonCoinForgivenessCopy'

export type LessonCoinForgivenessBubbleMode = 'active' | 'frozen' | 'exhausted'

type LessonCoinForgivenessBubbleButtonProps = {
  mode: LessonCoinForgivenessBubbleMode
  copy: LessonCoinForgivenessCopy
  onPress: () => void
}

export default function LessonCoinForgivenessBubbleButton({
  mode,
  copy,
  onPress,
}: LessonCoinForgivenessBubbleButtonProps) {
  const isDisabled = mode === 'frozen' || mode === 'exhausted'
  const label = mode === 'exhausted' ? copy.exhaustedLabel : copy.buttonLabel

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onPress}
      className={`chat-assistant-chip-button chat-action-button flex w-fit items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${
        mode === 'exhausted'
          ? 'cursor-default border-[var(--border-subtle)] bg-white/70 text-[var(--text-muted,#6b7280)] opacity-80'
          : mode === 'frozen'
            ? 'cursor-default border-amber-200/90 bg-amber-50/80 text-amber-700/70 opacity-80'
            : 'border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] text-[var(--chat-speaker-text)]'
      }`}
      title={mode === 'exhausted' ? copy.exhaustedLabel : copy.buttonAriaLabel}
      aria-label={mode === 'exhausted' ? copy.exhaustedLabel : copy.buttonAriaLabel}
    >
      {label}
    </button>
  )
}
