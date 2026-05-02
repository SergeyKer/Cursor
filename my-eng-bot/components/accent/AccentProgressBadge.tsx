'use client'

import * as React from 'react'
import { summarizeAccentProgress } from '@/lib/accent/progressStorage'

interface AccentProgressBadgeProps {
  lessonId: string
}

export default function AccentProgressBadge({ lessonId }: AccentProgressBadgeProps) {
  const [summary, setSummary] = React.useState(() => summarizeAccentProgress(lessonId))

  React.useEffect(() => {
    setSummary(summarizeAccentProgress(lessonId))
  }, [lessonId])

  const { progress, remainingToNextStage, label } = summary

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/75 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
      {progress.successfulAttempts}/20
      <span aria-hidden>·</span>
      {remainingToNextStage > 0 ? `ещё ${remainingToNextStage}` : label}
    </span>
  )
}
