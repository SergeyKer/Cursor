'use client'

import * as React from 'react'
import { subscribeAccentProgress, summarizeAccentProgress } from '@/lib/accent/progressStorage'

interface AccentProgressBadgeProps {
  lessonId: string
}

export default function AccentProgressBadge({ lessonId }: AccentProgressBadgeProps) {
  const [summary, setSummary] = React.useState(() => summarizeAccentProgress(lessonId))

  React.useEffect(() => {
    const refresh = () => setSummary(summarizeAccentProgress(lessonId))
    refresh()
    const unsubscribe = subscribeAccentProgress(refresh)
    return unsubscribe
  }, [lessonId])

  const { progress } = summary

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/75 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
      <span>С {progress.segmentSuccessfulAttempts.words}/20</span>
      <span aria-hidden>·</span>
      <span>П {progress.segmentSuccessfulAttempts.pairs}/20</span>
      <span aria-hidden>·</span>
      <span>Ц {progress.segmentSuccessfulAttempts.progressive}/20</span>
    </span>
  )
}
